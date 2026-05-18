import express from 'express'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { execSync, spawn } from 'child_process'
import {
  parseSilenceOutput,
  buildFilterComplex,
  remapSubtitleBlocks,
  type SilenceSegment,
  type SubtitleData,
  type Resolution,
  RESOLUTION_DIMS,
} from './filters'
import fs from 'fs'
import path from 'path'
import os from 'os'

function detectFfmpeg(): string | null {
  try {
    const p = execSync('which ffmpeg', { encoding: 'utf8' }).trim()
    if (p) return p
  } catch {}
  return ffmpegPath ?? null
}

const resolvedFfmpegPath = detectFfmpeg()
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

async function patchProject(projectId: string, fields: Record<string, unknown>): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const res = await fetch(`${supabaseUrl}/rest/v1/projects?id=eq.${projectId}`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(fields),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase PATCH projects failed ${res.status}: ${text}`)
  }
  console.log(`[patchProject] ok → status=${fields.status} project=${projectId}`)
}

async function downloadVideo(url: string, destPath: string): Promise<number> {
  let durationSeconds = 0
  await new Promise<void>((resolve) => {
    const proc = spawn('yt-dlp', ['--dump-json', '--no-download', url], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    proc.stdout?.on('data', (c: Buffer) => { out += c.toString() })
    proc.on('close', () => {
      try { durationSeconds = Math.round(JSON.parse(out).duration) || 0 } catch {}
      resolve()
    })
    proc.on('error', () => resolve())
  })
  console.log(`[download] duration=${durationSeconds}s url=${url.slice(0, 80)}`)

  await new Promise<void>((resolve, reject) => {
    const args = [
      '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '--no-playlist',
      '--max-filesize', '4G',
      '-o', destPath,
      url,
    ]
    console.log(`[download] starting yt-dlp → ${destPath}`)
    const proc = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    proc.stdout?.on('data', (c: Buffer) => process.stdout.write(c))
    proc.stderr?.on('data', (c: Buffer) => { stderr += c.toString() })
    proc.on('close', (code) => {
      if (code === 0) {
        const sizeMB = (fs.statSync(destPath).size / 1024 / 1024).toFixed(1)
        console.log(`[download] done ${sizeMB}MB`)
        resolve()
      } else {
        reject(new Error(`yt-dlp exited ${code}: ${stderr.slice(-500)}`))
      }
    })
    proc.on('error', (err) => reject(new Error(`yt-dlp spawn failed: ${err.message}`)))
  })

  return durationSeconds
}

async function startTranscriptionDirect(fileUrl: string, webhookUrl: string): Promise<string> {
  const res = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      authorization: process.env.ASSEMBLYAI_API_KEY!,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: fileUrl,
      webhook_url: webhookUrl,
      auto_highlights: true,
      language_detection: true,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AssemblyAI start failed ${res.status}: ${text}`)
  }
  const data = await res.json() as { id: string }
  console.log(`[transcription] started job=${data.id}`)
  return data.id
}

async function detectSilence(
  inputPath: string,
  clipStartSec: number,
  clipEndSec: number,
): Promise<SilenceSegment[]> {
  const clipDuration = clipEndSec - clipStartSec
  return new Promise((resolve) => {
    let stderr = ''
    const ffmpegBin = resolvedFfmpegPath ?? 'ffmpeg'
    const args = [
      '-ss', clipStartSec.toFixed(3),
      '-to', clipEndSec.toFixed(3),
      '-i', inputPath,
      '-af', `atrim=start=${clipStartSec.toFixed(3)}:end=${clipEndSec.toFixed(3)},asetpts=PTS-STARTPTS,silencedetect=noise=-30dB:duration=1.5`,
      '-f', 'null', '-',
    ]

    const proc = spawn(ffmpegBin, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    proc.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
    proc.on('close', () => {
      const segments = parseSilenceOutput(stderr, clipDuration)
      console.log(`[silence] ${segments.length} kept segments, silence lines: ${stderr.split('\n').filter(l => l.includes('silence')).length}`)
      resolve(segments)
    })
    proc.on('error', (err) => {
      console.warn('[silence] detection failed, skipping:', err.message)
      resolve([{ start: 0, end: clipDuration }])
    })
  })
}

function wrapText(text: string, videoWidth: number, fontSize: number): string {
  // Estimate chars per line: DejaVuSans-Bold avg char width ≈ 0.58 × fontSize
  const charsPerLine = Math.max(10, Math.floor(videoWidth / (fontSize * 0.58)))
  if (text.length <= charsPerLine) return text
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > charsPerLine && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines.join('\n')
}


async function processClip(
  clipId: string,
  sourceKey: string,
  startMs: number,
  endMs: number,
  cropX: number,
  subtitleData: SubtitleData | null,
  resolution: Resolution = '1080p',
): Promise<void> {
  const inputPath  = path.join(os.tmpdir(), `vh_in_${clipId}.mp4`)
  const outputPath = path.join(os.tmpdir(), `vh_out_${clipId}.mp4`)
  const textFiles: string[] = []

  try {
    const startSec = startMs / 1000
    const endSec   = endMs   / 1000
    const clipDurationSec = endSec - startSec

    console.log(`[process] clip ${clipId} | ${startMs}-${endMs}ms cropX=${cropX} res=${resolution} subs=${subtitleData ? subtitleData.blocks.length + ' blocks' : 'none'}`)

    await downloadFromR2(sourceKey, inputPath)

    // Pass 1: detect silence (fast, no encode)
    const rawSegments = await detectSilence(inputPath, startSec, endSec)
    const silenceRemoved = !(rawSegments.length === 1 &&
      rawSegments[0].start < 0.05 &&
      rawSegments[0].end > clipDurationSec - 0.05)
    const segments = silenceRemoved ? rawSegments : null

    const newDurationSec = segments
      ? segments.reduce((sum, s) => sum + s.end - s.start, 0)
      : clipDurationSec

    // Remap subtitle timestamps if silence was removed
    let effectiveSubs = subtitleData
    if (segments && subtitleData) {
      effectiveSubs = {
        ...subtitleData,
        blocks: remapSubtitleBlocks(subtitleData.blocks, segments),
      }
    }

    // Write subtitle text files
    if (effectiveSubs) {
      const { w: vw } = RESOLUTION_DIMS[resolution]
      for (let i = 0; i < effectiveSubs.blocks.length; i++) {
        const tf = path.join(os.tmpdir(), `vh_txt_${clipId}_${i}.txt`)
        const wrapped = wrapText(effectiveSubs.blocks[i].text, vw, effectiveSubs.font_size)
        fs.writeFileSync(tf, wrapped, 'utf8')
        textFiles.push(tf)
      }
      console.log(`[process] wrote ${textFiles.length} subtitle text files`)
    }

    // Pass 2: build filter_complex and encode
    const { filterComplex, mapVideo, mapAudio } = buildFilterComplex({
      segments,
      clipStartSec: startSec,
      clipEndSec: endSec,
      cropX,
      resolution,
      durationSec: newDurationSec,
      subtitleData: effectiveSubs,
      textFiles,
    })

    console.log(`[process] font=${effectiveSubs?.font ?? 'none'} box=${effectiveSubs?.box} shadow=${effectiveSubs?.shadow}`)
    console.log(`[process] filter_complex (first 500): ${filterComplex.slice(0, 500)}`)
    console.log(`[process] silence_removed=${silenceRemoved} new_duration=${newDurationSec.toFixed(1)}s`)

    await new Promise<void>((resolve, reject) => {
      const ff = ffmpeg(inputPath)
      let ffmpegStderr = ''

      ff.complexFilter(filterComplex)
        .outputOptions(['-map', mapVideo, '-map', mapAudio])
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOption('-movflags', 'faststart')
        .save(outputPath)
        .on('stderr', (line: string) => { ffmpegStderr += line + '\n' })
        .on('start', (cmd) => console.log(`[ffmpeg] cmd: ${cmd.slice(0, 200)}`))
        .on('end', () => resolve())
        .on('error', (err: Error) => {
          console.error(`[ffmpeg] STDERR_TAIL:
${ffmpegStderr.slice(-4000)}`)
          reject(new Error(`FFmpeg error: ${err.message}`))
        })
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

async function downloadAndTranscribe(projectId: string, url: string): Promise<void> {
  const tmpPath = path.join(os.tmpdir(), `vh_dl_${projectId}.mp4`)
  try {
    const durationSeconds = await downloadVideo(url, tmpPath)

    const r2Key = `projects/${projectId}/source.mp4`
    await uploadToR2(tmpPath, r2Key)
    const fileUrl = `${process.env.R2_PUBLIC_URL}/${r2Key}`

    await patchProject(projectId, {
      file_url: fileUrl,
      ...(durationSeconds > 0 ? { duration_seconds: durationSeconds } : {}),
      status: 'processing',
    })

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/transcribe/webhook`
    const jobId = await startTranscriptionDirect(fileUrl, webhookUrl)

    await patchProject(projectId, {
      transcript_job_id: jobId,
      status: 'transcribing',
    })

    console.log(`[download] project=${projectId} → transcribing ✓`)
  } catch (err) {
    console.error(`[download] FAILED project=${projectId}:`, err)
    try { await patchProject(projectId, { status: 'error' }) } catch {}
  } finally {
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath) } catch {}
  }
}

app.post('/download', (req, res) => {
  if (req.headers['x-worker-secret'] !== process.env.WORKER_SECRET) {
    res.status(401).json({ error: 'Unauthorized' }); return
  }

  const { projectId, url, userId } = req.body as Record<string, unknown>

  if (typeof projectId !== 'string' || !/^[0-9a-f-]{36}$/.test(projectId)) {
    res.status(400).json({ error: 'Invalid projectId' }); return
  }
  if (typeof url !== 'string' || !url) {
    res.status(400).json({ error: 'Invalid url' }); return
  }
  if (typeof userId !== 'string' || !userId) {
    res.status(400).json({ error: 'Invalid userId' }); return
  }

  console.log(`[request] /download project=${projectId} url=${url.slice(0, 80)}`)
  res.json({ ok: true })

  downloadAndTranscribe(projectId, url).catch((err) =>
    console.error('[unhandled /download]', err)
  )
})

app.get('/health', (_req, res) => {
  res.json({ ok: true, ffmpeg: resolvedFfmpegPath ?? 'missing' })
})

app.get('/fonts', (_req, res) => {
  const dirs = [
    '/usr/share/fonts/truetype/google',
    '/usr/share/fonts/truetype/dejavu',
    '/usr/share/fonts/truetype/liberation',
  ]
  const result: Record<string, { file: string; kb: number }[]> = {}
  for (const d of dirs) {
    try {
      result[d] = fs.readdirSync(d).map(f => ({
        file: f,
        kb: Math.round(fs.statSync(`${d}/${f}`).size / 1024),
      }))
    } catch { result[d] = [] }
  }
  res.json(result)
})

app.post('/process', (req, res) => {
  if (req.headers.authorization !== `Bearer ${process.env.WORKER_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' }); return
  }

  const { clip_id, source_key, start_time, end_time, crop_x, subtitle_data, resolution } =
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

  const parsedResolution: Resolution =
    resolution === '720p' ? '720p' : '1080p'

  console.log(`[request] /process clip=${clip_id} subs=${parsedSubtitleData ? 'yes' : 'no'} res=${parsedResolution}`)
  res.json({ ok: true })

  processClip(clip_id, source_key, start_time, end_time, crop_x, parsedSubtitleData, parsedResolution)
    .catch((err) => console.error('[unhandled]', err))
})

const PORT = process.env.PORT ?? 3001
app.listen(Number(PORT), () => {
  console.log(`[startup] listening on port ${PORT}`)
  console.log(`[startup] R2_ACCOUNT_ID=${process.env.R2_ACCOUNT_ID ? 'SET' : 'MISSING'}`)
  console.log(`[startup] SUPABASE_URL=${process.env.SUPABASE_URL ? 'SET' : 'MISSING'}`)
  console.log(`[startup] WORKER_SECRET=${process.env.WORKER_SECRET ? 'SET' : 'MISSING'}`)
  console.log(`[startup] subtitle engine: drawtext`)
})
