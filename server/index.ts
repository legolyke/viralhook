import express from 'express'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'
import os from 'os'

const resolvedFfmpegPath = ffmpegPath ?? null
console.log('[startup] ffmpeg path:', resolvedFfmpegPath ?? 'NOT FOUND')
if (resolvedFfmpegPath) ffmpeg.setFfmpegPath(resolvedFfmpegPath)

const app = express()
app.use(express.json({ limit: '2mb' }))

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
})

interface SubtitleData {
  blocks: { start: number; end: number; text: string }[]
  font_size: number
  color: string    // hex e.g. '#FFFFFF'
  position: string // 'bottom' | 'top'
}

async function downloadFromR2(key: string, destPath: string): Promise<void> {
  console.log(`[r2] downloading key: ${key}`)
  const res = await r2.send(new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }))
  if (!res.Body) throw new Error('Empty body from R2')
  const chunks: Uint8Array[] = []
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  fs.writeFileSync(destPath, Buffer.concat(chunks))
  const sizeMB = (fs.statSync(destPath).size / 1024 / 1024).toFixed(1)
  console.log(`[r2] downloaded ${sizeMB}MB → ${destPath}`)
}

async function uploadToR2(localPath: string, key: string): Promise<void> {
  console.log(`[r2] uploading ${key}`)
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: fs.readFileSync(localPath),
    ContentType: 'video/mp4',
  }))
  console.log(`[r2] uploaded ${key}`)
}

async function patchClip(clipId: string, fields: Record<string, unknown>): Promise<void> {
  const url = `${process.env.SUPABASE_URL}/rest/v1/rpc/update_clip_status`
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_clip_id: clipId,
      p_status: fields.status,
      p_file_url: (fields.file_url as string | undefined) ?? null,
    }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Supabase RPC failed ${res.status}: ${text}`)
  console.log(`[patchClip] RPC ok → status=${fields.status} clip=${clipId}`)
}

function buildVideoFilter(
  cropX: number,
  subtitleData: SubtitleData | null,
  textFiles: string[],
): string {
  let filter = `crop=ih*9/16:ih:(iw-ih*9/16)*${cropX}:0,scale=1080:1920`

  if (subtitleData && textFiles.length > 0) {
    const colorHex = subtitleData.color.replace('#', '')
    const y = subtitleData.position === 'top'
      ? `${subtitleData.font_size}`
      : `h-th-${Math.round(subtitleData.font_size * 1.5)}`

    const filters = subtitleData.blocks.map((block, i) => {
      if (!textFiles[i]) return null
      const startS = (block.start / 1000).toFixed(3)
      const endS   = (block.end   / 1000).toFixed(3)
      const tf = textFiles[i].replace(/\\/g, '/')
      return (
        `drawtext=textfile='${tf}'` +
        `:x=(w-text_w)/2:y=${y}` +
        `:fontsize=${subtitleData.font_size}` +
        `:fontcolor=0x${colorHex}` +
        `:borderw=3:bordercolor=0x000000` +
        `:bold=1` +
        `:enable='between(t,${startS},${endS})'`
      )
    }).filter(Boolean) as string[]

    if (filters.length > 0) {
      filter += ',' + filters.join(',')
    }
  }

  return filter
}

async function processClip(
  clipId: string,
  sourceKey: string,
  startMs: number,
  endMs: number,
  cropX: number,
  subtitleData: SubtitleData | null,
): Promise<void> {
  const inputPath  = path.join(os.tmpdir(), `vh_in_${clipId}.mp4`)
  const outputPath = path.join(os.tmpdir(), `vh_out_${clipId}.mp4`)
  const textFiles: string[] = []

  try {
    console.log(`[process] clip ${clipId} | ${startMs}-${endMs}ms cropX=${cropX} subs=${subtitleData ? subtitleData.blocks.length + ' blocks' : 'none'}`)

    await downloadFromR2(sourceKey, inputPath)

    // Write one text file per subtitle block
    if (subtitleData) {
      for (let i = 0; i < subtitleData.blocks.length; i++) {
        const tf = path.join(os.tmpdir(), `vh_txt_${clipId}_${i}.txt`)
        fs.writeFileSync(tf, subtitleData.blocks[i].text, 'utf8')
        textFiles.push(tf)
      }
      console.log(`[process] wrote ${textFiles.length} subtitle text files`)
    }

    const videoFilter = buildVideoFilter(cropX, subtitleData, textFiles)
    console.log(`[process] filter: ${videoFilter.slice(0, 120)}...`)

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime((startMs / 1000).toFixed(3))
        .setDuration(((endMs - startMs) / 1000).toFixed(3))
        .videoFilter(videoFilter)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOption('-movflags', 'faststart')
        .save(outputPath)
        .on('start', (cmd) => console.log(`[ffmpeg] cmd: ${cmd.slice(0, 200)}`))
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(new Error(`FFmpeg error: ${err.message}`)))
    })
    console.log(`[process] ffmpeg done for ${clipId}`)

    const outputKey = `clips/${clipId}.mp4`
    await uploadToR2(outputPath, outputKey)

    const fileUrl = `${process.env.R2_PUBLIC_URL}/${outputKey}`
    await patchClip(clipId, { file_url: fileUrl, status: 'ready' })
    console.log(`[process] clip ${clipId} → ready ✓`)
  } catch (err) {
    console.error(`[process] FAILED clip ${clipId}:`, err)
    try { await patchClip(clipId, { status: 'error' }) } catch {}
  } finally {
    for (const p of [inputPath, outputPath, ...textFiles]) {
      try { if (fs.existsSync(p)) fs.unlinkSync(p) } catch {}
    }
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, ffmpeg: resolvedFfmpegPath ?? 'missing' })
})

app.post('/process', (req, res) => {
  if (req.headers.authorization !== `Bearer ${process.env.WORKER_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' }); return
  }

  const { clip_id, source_key, start_time, end_time, crop_x, subtitle_data } =
    req.body as Record<string, unknown>

  if (typeof clip_id !== 'string' || !/^[0-9a-f-]{36}$/.test(clip_id)) {
    res.status(400).json({ error: 'Invalid clip_id' }); return
  }
  if (typeof source_key !== 'string' || !source_key) {
    res.status(400).json({ error: 'Invalid source_key' }); return
  }
  if (typeof start_time !== 'number' || typeof end_time !== 'number' || typeof crop_x !== 'number') {
    res.status(400).json({ error: 'Invalid start_time / end_time / crop_x' }); return
  }
  if (end_time <= start_time) {
    res.status(400).json({ error: 'end_time must be greater than start_time' }); return
  }
  if (crop_x < 0 || crop_x > 1) {
    res.status(400).json({ error: 'crop_x must be between 0 and 1' }); return
  }

  const parsedSubtitleData = subtitle_data && typeof subtitle_data === 'object'
    ? subtitle_data as SubtitleData
    : null

  console.log(`[request] /process clip=${clip_id} subs=${parsedSubtitleData ? 'yes' : 'no'}`)
  res.json({ ok: true })

  processClip(clip_id, source_key, start_time, end_time, crop_x, parsedSubtitleData)
    .catch((err) => console.error('[unhandled]', err))
})

const PORT = process.env.PORT ?? 3001
app.listen(Number(PORT), () => {
  console.log(`[startup] listening on port ${PORT}`)
  console.log(`[startup] R2_ACCOUNT_ID=${process.env.R2_ACCOUNT_ID ? 'SET' : 'MISSING'}`)
  console.log(`[startup] SUPABASE_URL=${process.env.SUPABASE_URL ? 'SET' : 'MISSING'}`)
  console.log(`[startup] WORKER_SECRET=${process.env.WORKER_SECRET ? 'SET' : 'MISSING'}`)
})
