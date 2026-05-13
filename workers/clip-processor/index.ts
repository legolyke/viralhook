import { FFmpeg } from '@ffmpeg/ffmpeg'
import { buildCropFilter } from './crop'

interface R2Object {
  arrayBuffer(): Promise<ArrayBuffer>
}

interface R2Bucket {
  get(key: string): Promise<R2Object | null>
  put(key: string, value: Uint8Array, options?: { httpMetadata?: { contentType: string } }): Promise<void>
}

interface Env {
  R2: R2Bucket
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  WORKER_SECRET: string
  R2_PUBLIC_URL: string
}

interface ClipRequest {
  clip_id: string
  source_key: string
  start_time: number
  end_time: number
  crop_x: number
}

async function patchClip(env: Env, clipId: string, fields: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/clips?id=eq.${clipId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
  })
  if (!res.ok) throw new Error(`Supabase PATCH failed: ${res.status}`)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.headers.get('Authorization') !== `Bearer ${env.WORKER_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: ClipRequest
    try {
      body = await request.json() as ClipRequest
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { clip_id, source_key, start_time, end_time, crop_x } = body

    try {
      const obj = await env.R2.get(source_key)
      if (!obj) throw new Error(`Source not found in R2: ${source_key}`)
      const sourceBuffer = new Uint8Array(await obj.arrayBuffer())

      const ffmpeg = new FFmpeg()
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
      await ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
      })

      await ffmpeg.writeFile('input.mp4', sourceBuffer)

      const startS = (start_time / 1000).toFixed(3)
      const durationS = ((end_time - start_time) / 1000).toFixed(3)

      await ffmpeg.exec([
        '-ss', startS,
        '-t', durationS,
        '-i', 'input.mp4',
        '-vf', buildCropFilter(crop_x),
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-movflags', 'faststart',
        'output.mp4',
      ])

      const outputData = await ffmpeg.readFile('output.mp4')
      const outputBytes = outputData instanceof Uint8Array ? outputData : new Uint8Array(outputData as ArrayBuffer)
      const outputKey = `clips/${clip_id}.mp4`

      await env.R2.put(outputKey, outputBytes, { httpMetadata: { contentType: 'video/mp4' } })

      const fileUrl = `${env.R2_PUBLIC_URL}/${outputKey}`
      await patchClip(env, clip_id, { file_url: fileUrl, status: 'ready' })

      return Response.json({ ok: true })
    } catch (err) {
      try {
        await patchClip(env, clip_id, { status: 'error' })
      } catch {}
      console.error('[clip-processor] error:', err)
      return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
    }
  },
}
