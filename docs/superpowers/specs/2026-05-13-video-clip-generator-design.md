# Module 7 — Video Clip Generator Design

**Date:** 2026-05-13
**Status:** Approved
**Project:** ViralHook — AI Viral Shorts Generator

---

## Goal

Allow users to generate an actual 9:16 video clip from a detected viral moment. The user positions a crop area on the original video, clicks "Generate Clip", and receives a downloadable MP4 when processing completes.

---

## Architecture

### Flow

```
User clicks Export on a clip card
  → ExportModal opens (crop selector)
  → User positions 9:16 crop box, clicks "Generate"
  → POST /api/clips/[id]/export
      → clips.status = 'processing'
      → Cloudflare Worker called with { clip_id, source_key, start_time, end_time, crop_x }
  → Worker: R2 download → FFmpeg WASM (cut + 9:16 crop) → R2 upload
  → Worker: Supabase REST → clips.file_url + clips.status = 'ready'
  → UI polls /api/clips/[id]/status every 2s
      → progress bar fills over estimated duration
      → status = 'ready' → Download button appears
```

### Trigger

On-demand — user explicitly clicks Export on a specific clip. No automatic processing.

### Output format

Always 9:16 vertical (1080×1920). Crop position is user-defined.

---

## Files

**New:**
- `components/project/ExportModal.tsx` — modal with crop selector, progress bar, download button
- `app/api/clips/[id]/export/route.ts` — POST endpoint, triggers Worker
- `app/api/clips/[id]/status/route.ts` — GET endpoint, returns clip status + file_url
- `workers/clip-processor/index.ts` — Cloudflare Worker with FFmpeg WASM
- `workers/clip-processor/wrangler.toml` — Worker config (R2 binding, env vars)
- `workers/clip-processor/package.json` — Worker dependencies (@ffmpeg/ffmpeg, @ffmpeg/util)

**Modified:**
- `components/project/ClipsGrid.tsx` — Export button becomes clickable, opens ExportModal

---

## UI — ExportModal

### State 1: Crop Selector

- Displays first frame of the original video (HTML5 `<video>` paused at `start_time / 1000` seconds)
- Overlay: draggable 9:16 rectangle (purple border) the user positions left/right
- `crop_x` = normalized horizontal offset (0.0 = leftmost, 1.0 = rightmost valid position)
- Caption: "Position the crop area for your 9:16 clip"
- Button: "Generate Clip" → triggers POST, transitions to State 2

### State 2: Processing

- Progress bar fills over estimated duration (`(end_time - start_time) / 1000 * 2` seconds)
- Text: "Generating your clip..."
- Polls `GET /api/clips/[id]/status` every 2 seconds
- On `status = 'ready'` → transition to State 3
- On `status = 'error'` → transition to error state

### State 3: Done

- Text: "Your clip is ready!"
- "Download" button → opens `clips.file_url` in new tab
- "Re-generate" button → returns to State 1

### Error state

- Text: "Generation failed."
- "Try again" button → returns to State 1 (resets clip status to 'detected' via API)

---

## API Routes

### `POST /api/clips/[id]/export`

**Auth:** required — returns 401 if not authenticated
**Ownership:** `.eq('user_id', user.id)` — returns 404 if not owner

**Flow:**
1. Fetch clip row (id, project_id, user_id, start_time, end_time, status)
2. Fetch project row for `file_url` (source video key)
3. Set `clips.status = 'processing'`, `clips.updated_at = now()`
4. Call Cloudflare Worker via fetch with `WORKER_SECRET` header
5. Return `{ ok: true }`

**Body:** `{ crop_x: number }` — normalized 0.0–1.0

### `GET /api/clips/[id]/status`

**Auth:** required
**Returns:** `{ status: string, file_url: string | null }`

### Worker endpoint (internal)

Called by Next.js only. Authenticated via `Authorization: Bearer {WORKER_SECRET}` header.

**Body:**
```json
{
  "clip_id": "uuid",
  "source_key": "uploads/project-id/filename.mp4",
  "start_time": 5000,
  "end_time": 35000,
  "crop_x": 0.3
}
```

---

## Cloudflare Worker

### Config (`wrangler.toml`)

```toml
name = "viralhook-clip-processor"
main = "index.ts"
compatibility_date = "2025-05-13"

[[r2_buckets]]
binding = "R2"
bucket_name = "viralhook"

[vars]
SUPABASE_URL = ""

# Secrets (set via wrangler secret put):
# SUPABASE_SERVICE_ROLE_KEY
# WORKER_SECRET
```

### Processing logic

```
1. Verify Authorization header (WORKER_SECRET)
2. Parse body: { clip_id, source_key, start_time, end_time, crop_x }
3. Download source video from R2 via binding: R2.get(source_key)
4. Load FFmpeg WASM
5. Run: ffmpeg -ss {start_s} -t {duration_s} -i input.mp4
         -vf "crop={crop_w}:{h}:{crop_x_px}:0,scale=1080:1920"
         -c:v libx264 -c:a aac -movflags faststart output.mp4
6. Upload result to R2: R2.put("clips/{clip_id}.mp4", outputBuffer)
7. PATCH Supabase: clips.file_url = R2_PUBLIC_URL/clips/{clip_id}.mp4
                   clips.status = 'ready'
                   clips.updated_at = now()
8. Return { ok: true }
```

**On error:**
- PATCH Supabase: `clips.status = 'error'`
- Return `{ error: message }` with status 500

### Crop calculation

Given `crop_x` (0.0–1.0) and source dimensions (W × H):
- Target aspect: 9:16 → crop width = `H × 9/16`
- Max offset: `W - crop_w`
- Pixel offset: `Math.round(crop_x × (W - crop_w))`

FFmpeg filter: `crop={crop_w}:{H}:{offset}:0,scale=1080:1920`

---

## Storage

Clip files stored in R2 at `clips/{clip_id}.mp4`.

R2 public URL: `{R2_PUBLIC_URL}/clips/{clip_id}.mp4` → saved to `clips.file_url`.

---

## Security

- Export endpoint requires authenticated user + ownership check
- Worker URL and `WORKER_SECRET` are server-side only, never exposed to client
- Worker validates `WORKER_SECRET` on every request — rejects unauthorized calls
- `SUPABASE_SERVICE_ROLE_KEY` in Worker is a Wrangler secret (not in wrangler.toml)

---

## Environment Variables

**Next.js (Vercel):**
- `WORKER_URL` — Cloudflare Worker URL (e.g. `https://viralhook-clip-processor.workers.dev`)
- `WORKER_SECRET` — shared secret for Worker auth

**Cloudflare Worker (Wrangler secrets):**
- `SUPABASE_SERVICE_ROLE_KEY` — for updating clips table
- `WORKER_SECRET` — same secret as above
- `SUPABASE_URL` — Supabase project URL
- `R2_PUBLIC_URL` — public base URL for R2 files

---

## Known Limitations

- FFmpeg WASM requires ~500MB RAM — Workers Unbound (paid, $5/month) needed for videos over ~100MB
- For very long videos (agency plan, 6h), memory may be insufficient — can migrate to AWS Lambda later if needed
- First clip generation may be slower (~5s overhead for FFmpeg WASM initialization)
- Crop is horizontal only — vertical position is always centered
