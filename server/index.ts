import express from 'express'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import fs from 'fs'
import path from 'path'
import os from 'os'

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath)

const app = express()
app.use(express.json({ limit: '1mb' }))

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED' as never,
  responseChecksumValidation: 'WHEN_REQUIRED' as never,
})

async function downloadFromR2(key: string, destPath: string): Promise<void> {
  const res = await r2.send(new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }))
  if (!res.Body) throw new Error('Empty body from R2')
  await pipeline(res.Body as Readable, fs.createWriteStream(destPath))
}

async function uploadToR2(localPath: string, key: string): Promise<void> {
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: fs.createReadStream(localPath),
    ContentType: 'video/mp4',
  }))
}

async function patchClip(clipId: string, fields: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/clips?id=eq.${clipId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
  })
  if (!res.ok) throw new Error(`Supabase PATCH failed: ${res.status}`)
}

function buildCropFilter(cropX: number): string {
  return `crop=ih*9/16:ih:(iw-ih*9/16)*${cropX}:0,scale=1080:1920`
}

async function processClip(
  clipId: string,
  sourceKey: string,
  startMs: number,
  endMs: number,
  cropX: number,
): Promise<void> {
  const inputPath = path.join(os.tmpdir(), `vh_in_${clipId}.mp4`)
  const outputPath = path.join(os.tmpdir(), `vh_out_${clipId}.mp4`)

  try {
    console.log(`[clip-processor] starting clip ${clipId}`)
    await downloadFromR2(sourceKey, inputPath)
    console.log(`[clip-processor] downloaded source for ${clipId}`)

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime((startMs / 1000).toFixed(3))
        .setDuration(((endMs - startMs) / 1000).toFixed(3))
        .videoFilter(buildCropFilter(cropX))
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOption('-movflags', 'faststart')
        .save(outputPath)
        .on('end', resolve)
        .on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)))
    })
    console.log(`[clip-processor] ffmpeg done for ${clipId}`)

    const outputKey = `clips/${clipId}.mp4`
    await uploadToR2(outputPath, outputKey)
    console.log(`[clip-processor] uploaded ${outputKey}`)

    const fileUrl = `${process.env.R2_PUBLIC_URL}/${outputKey}`
    await patchClip(clipId, { file_url: fileUrl, status: 'ready' })
    console.log(`[clip-processor] clip ${clipId} ready`)
  } catch (err) {
    console.error(`[clip-processor] failed clip ${clipId}:`, err)
    try { await patchClip(clipId, { status: 'error' }) } catch {}
  } finally {
    for (const p of [inputPath, outputPath]) {
      if (fs.existsSync(p)) fs.unlinkSync(p)
    }
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/process', (req, res) => {
  if (req.headers.authorization !== `Bearer ${process.env.WORKER_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { clip_id, source_key, start_time, end_time, crop_x } = req.body as Record<string, unknown>

  if (typeof clip_id !== 'string' || !/^[0-9a-f-]{36}$/.test(clip_id)) {
    res.status(400).json({ error: 'Invalid clip_id' })
    return
  }
  if (typeof source_key !== 'string' || !source_key) {
    res.status(400).json({ error: 'Invalid source_key' })
    return
  }
  if (typeof start_time !== 'number' || typeof end_time !== 'number' || typeof crop_x !== 'number') {
    res.status(400).json({ error: 'Invalid start_time / end_time / crop_x' })
    return
  }
  if (end_time <= start_time) {
    res.status(400).json({ error: 'end_time must be greater than start_time' })
    return
  }
  if (crop_x < 0 || crop_x > 1) {
    res.status(400).json({ error: 'crop_x must be between 0 and 1' })
    return
  }

  // Respond immediately — process in background
  res.json({ ok: true })
  processClip(clip_id, source_key, start_time, end_time, crop_x).catch(
    (err) => console.error('[clip-processor] unhandled:', err)
  )
})

const PORT = process.env.PORT ?? 3001
app.listen(Number(PORT), () => {
  console.log(`[clip-processor] listening on port ${PORT}`)
})
