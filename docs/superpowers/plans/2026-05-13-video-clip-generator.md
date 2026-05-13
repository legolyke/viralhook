# Module 7 — Video Clip Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to export a detected viral clip as a downloadable 9:16 MP4, with a user-positioned crop selector and real-time progress tracking.

**Architecture:** User clicks Export on a clip card → ExportModal opens with a crop selector (draggable 9:16 box over the source video frame) → POST /api/clips/[id]/export triggers a Cloudflare Worker → Worker downloads source from R2, runs FFmpeg WASM (cut + crop + scale to 1080×1920) → uploads output to R2 → patches Supabase → UI polls for status → Download button appears.

**Tech Stack:** Next.js 16 App Router, Cloudflare Workers, @ffmpeg/ffmpeg 0.12.x, Supabase REST (from Worker), R2 (via Worker binding), Vitest

---

## File Map

**New files:**
- `workers/clip-processor/crop.ts` — pure `buildCropFilter(cropX)` utility (testable without CF deps)
- `workers/clip-processor/index.ts` — Cloudflare Worker: download R2 → FFmpeg WASM → upload R2 → patch Supabase
- `workers/clip-processor/package.json` — Worker dependencies
- `workers/clip-processor/wrangler.toml` — R2 binding + env vars
- `workers/clip-processor/tsconfig.json` — Worker-specific TS config
- `app/api/clips/[id]/export/route.ts` — POST: auth + ownership check + set processing + call Worker
- `app/api/clips/[id]/status/route.ts` — GET: returns clip status + file_url for polling
- `components/project/ExportModal.tsx` — 3-state modal (crop selector → processing → done)
- `tests/workers/clip-processor.test.ts` — unit tests for buildCropFilter
- `tests/api/clips-export.test.ts` — unit tests for export route
- `tests/api/clips-status.test.ts` — unit tests for status route

**Modified files:**
- `tsconfig.json` — add `"workers"` to `exclude` array
- `components/project/ClipsGrid.tsx` — Export button opens ExportModal
- `app/(dashboard)/projects/[id]/page.tsx` — select `file_url` from clips, pass `projectFileUrl` to ClipsGrid

---

## Task 1: Cloudflare Worker

**Files:**
- Create: `workers/clip-processor/crop.ts`
- Create: `workers/clip-processor/index.ts`
- Create: `workers/clip-processor/package.json`
- Create: `workers/clip-processor/wrangler.toml`
- Create: `workers/clip-processor/tsconfig.json`
- Modify: `tsconfig.json`
- Test: `tests/workers/clip-processor.test.ts`

- [ ] **Step 1: Exclude workers directory from main tsconfig**

In `tsconfig.json`, change the `exclude` array:

```json
"exclude": ["node_modules", "workers"]
```

- [ ] **Step 2: Write the failing test**

Create `tests/workers/clip-processor.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildCropFilter } from '../../workers/clip-processor/crop'

describe('buildCropFilter', () => {
  it('generates correct filter for crop_x = 0 (leftmost position)', () => {
    expect(buildCropFilter(0)).toBe(
      'crop=ih*9/16:ih:(iw-ih*9/16)*0:0,scale=1080:1920'
    )
  })

  it('generates correct filter for crop_x = 1 (rightmost position)', () => {
    expect(buildCropFilter(1)).toBe(
      'crop=ih*9/16:ih:(iw-ih*9/16)*1:0,scale=1080:1920'
    )
  })

  it('generates correct filter for crop_x = 0.5 (center)', () => {
    expect(buildCropFilter(0.5)).toBe(
      'crop=ih*9/16:ih:(iw-ih*9/16)*0.5:0,scale=1080:1920'
    )
  })
})
```

- [ ] **Step 3: Run the test — expect FAIL (module not found)**

```
npx vitest run tests/workers/clip-processor.test.ts
```

Expected: FAIL with "Cannot find module '../../workers/clip-processor/crop'"

- [ ] **Step 4: Create crop.ts (pure utility)**

Create `workers/clip-processor/crop.ts`:

```typescript
export function buildCropFilter(cropX: number): string {
  return `crop=ih*9/16:ih:(iw-ih*9/16)*${cropX}:0,scale=1080:1920`
}
```

Explanation of the FFmpeg filter:
- `ih*9/16` — crop width = input height × 9/16 (9:16 vertical slice of a landscape source)
- `ih` — crop height = full source height
- `(iw-ih*9/16)*cropX` — horizontal offset, ranging from 0 (left edge) to `iw - ih*9/16` (right edge)
- `scale=1080:1920` — scale the cropped 9:16 region to 1080×1920

- [ ] **Step 5: Run the test — expect PASS**

```
npx vitest run tests/workers/clip-processor.test.ts
```

Expected: 3 tests PASS

- [ ] **Step 6: Create workers/clip-processor/index.ts**

```typescript
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
```

- [ ] **Step 7: Create workers/clip-processor/package.json**

```json
{
  "name": "viralhook-clip-processor",
  "version": "1.0.0",
  "private": true,
  "main": "index.ts",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "@ffmpeg/ffmpeg": "^0.12.7",
    "@ffmpeg/util": "^0.12.1"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241205.0",
    "typescript": "^5.0.0",
    "wrangler": "^3.101.0"
  }
}
```

- [ ] **Step 8: Create workers/clip-processor/wrangler.toml**

```toml
name = "viralhook-clip-processor"
main = "index.ts"
compatibility_date = "2025-05-13"

[[r2_buckets]]
binding = "R2"
bucket_name = "viralhook"

[vars]
SUPABASE_URL = ""
R2_PUBLIC_URL = ""

# Secrets — set via: wrangler secret put <NAME>
# SUPABASE_SERVICE_ROLE_KEY
# WORKER_SECRET
```

- [ ] **Step 9: Create workers/clip-processor/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "bundler",
    "strict": true,
    "lib": ["ES2020"],
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["*.ts"]
}
```

- [ ] **Step 10: Run all tests to verify nothing broken**

```
npx vitest run
```

Expected: all tests PASS (including the 3 new crop tests)

- [ ] **Step 11: Commit**

```bash
git add workers/ tests/workers/ tsconfig.json
git commit -m "feat(module7): add Cloudflare Worker scaffold with FFmpeg WASM crop logic"
```

---

## Task 2: POST /api/clips/[id]/export route

**Files:**
- Create: `app/api/clips/[id]/export/route.ts`
- Create: `tests/api/clips-export.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/api/clips-export.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.hoisted(() => vi.fn())
vi.stubGlobal('fetch', mockFetch)

const mockSingle = vi.hoisted(() => vi.fn())
const mockUpdate = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
    from: vi.fn().mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue(mockUpdate()),
      })),
      single: vi.fn().mockImplementation(() => mockSingle(table)),
    })),
  }),
}))

import { POST } from '@/app/api/clips/[id]/export/route'

const mockClip = {
  id: 'clip-1',
  project_id: 'proj-1',
  user_id: 'user-123',
  start_time: 5000,
  end_time: 35000,
  status: 'detected',
}
const mockProject = {
  file_url: 'https://pub.r2.dev/uploads/proj-1/video.mp4',
}

describe('POST /api/clips/[id]/export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('WORKER_URL', 'https://test-worker.workers.dev')
    vi.stubEnv('WORKER_SECRET', 'test-secret')
    vi.stubEnv('R2_PUBLIC_URL', 'https://pub.r2.dev')
  })

  it('returns 401 when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crop_x: 0.5 }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'clip-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when clip not found', async () => {
    mockSingle.mockImplementation(() => ({ data: null, error: null }))

    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crop_x: 0.5 }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'clip-1' }) })
    expect(res.status).toBe(404)
  })

  it('calls Worker and returns ok:true on success', async () => {
    let callCount = 0
    mockSingle.mockImplementation(() => {
      callCount++
      if (callCount === 1) return { data: mockClip, error: null }
      return { data: mockProject, error: null }
    })
    mockUpdate.mockReturnValue({ error: null })
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })

    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crop_x: 0.5 }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'clip-1' }) })
    const body = await res.json() as { ok: boolean }
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)

    const workerCall = mockFetch.mock.calls[0]
    expect(workerCall[0]).toBe('https://test-worker.workers.dev')
    const workerBody = JSON.parse((workerCall[1] as RequestInit).body as string)
    expect(workerBody.clip_id).toBe('clip-1')
    expect(workerBody.crop_x).toBe(0.5)
    expect(workerBody.start_time).toBe(5000)
    expect(workerBody.end_time).toBe(35000)
  })

  it('returns 400 when crop_x is missing', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'clip-1' }) })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL (module not found)**

```
npx vitest run tests/api/clips-export.test.ts
```

Expected: FAIL with "Cannot find module '@/app/api/clips/[id]/export/route'"

- [ ] **Step 3: Create app/api/clips/[id]/export/route.ts**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getR2KeyFromUrl } from '@/lib/r2'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const cropX = (body as Record<string, unknown>)?.crop_x
  if (typeof cropX !== 'number' || cropX < 0 || cropX > 1) {
    return NextResponse.json({ error: 'crop_x must be a number between 0 and 1' }, { status: 400 })
  }

  const { id } = await params

  const { data: clip } = await supabase
    .from('clips')
    .select('id, project_id, user_id, start_time, end_time, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

  const { data: project } = await supabase
    .from('projects')
    .select('file_url')
    .eq('id', clip.project_id)
    .single()

  if (!project?.file_url) {
    return NextResponse.json({ error: 'Source video not found' }, { status: 404 })
  }

  await supabase
    .from('clips')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', id)

  const sourceKey = getR2KeyFromUrl(project.file_url)

  const workerRes = await fetch(process.env.WORKER_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.WORKER_SECRET}`,
    },
    body: JSON.stringify({
      clip_id: id,
      source_key: sourceKey,
      start_time: clip.start_time,
      end_time: clip.end_time,
      crop_x: cropX,
    }),
  })

  if (!workerRes.ok) {
    await supabase
      .from('clips')
      .update({ status: 'error', updated_at: new Date().toISOString() })
      .eq('id', id)
    return NextResponse.json({ error: 'Worker failed to start' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run test — expect PASS**

```
npx vitest run tests/api/clips-export.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Run full test suite**

```
npx vitest run
```

Expected: all existing tests still PASS

- [ ] **Step 6: Commit**

```bash
git add app/api/clips/ tests/api/clips-export.test.ts
git commit -m "feat(module7): add POST /api/clips/[id]/export route"
```

---

## Task 3: GET /api/clips/[id]/status route

**Files:**
- Create: `app/api/clips/[id]/status/route.ts`
- Create: `tests/api/clips-status.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/api/clips-status.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSingle = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => mockSingle()),
    })),
  }),
}))

import { GET } from '@/app/api/clips/[id]/status/route'

describe('GET /api/clips/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const req = new Request('http://localhost')
    const res = await GET(req, { params: Promise.resolve({ id: 'clip-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when clip not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })

    const req = new Request('http://localhost')
    const res = await GET(req, { params: Promise.resolve({ id: 'clip-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns status and file_url for a ready clip', async () => {
    mockSingle.mockResolvedValue({
      data: { status: 'ready', file_url: 'https://pub.r2.dev/clips/clip-1.mp4' },
      error: null,
    })

    const req = new Request('http://localhost')
    const res = await GET(req, { params: Promise.resolve({ id: 'clip-1' }) })
    const body = await res.json() as { status: string; file_url: string }
    expect(res.status).toBe(200)
    expect(body.status).toBe('ready')
    expect(body.file_url).toBe('https://pub.r2.dev/clips/clip-1.mp4')
  })

  it('returns status = processing with null file_url while in progress', async () => {
    mockSingle.mockResolvedValue({
      data: { status: 'processing', file_url: null },
      error: null,
    })

    const req = new Request('http://localhost')
    const res = await GET(req, { params: Promise.resolve({ id: 'clip-1' }) })
    const body = await res.json() as { status: string; file_url: null }
    expect(res.status).toBe(200)
    expect(body.status).toBe('processing')
    expect(body.file_url).toBeNull()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL (module not found)**

```
npx vitest run tests/api/clips-status.test.ts
```

Expected: FAIL with "Cannot find module '@/app/api/clips/[id]/status/route'"

- [ ] **Step 3: Create app/api/clips/[id]/status/route.ts**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: clip } = await supabase
    .from('clips')
    .select('status, file_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

  return NextResponse.json({ status: clip.status, file_url: clip.file_url ?? null })
}
```

- [ ] **Step 4: Run test — expect PASS**

```
npx vitest run tests/api/clips-status.test.ts
```

Expected: all 4 tests PASS

- [ ] **Step 5: Run full suite**

```
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add app/api/clips/[id]/status/ tests/api/clips-status.test.ts
git commit -m "feat(module7): add GET /api/clips/[id]/status route"
```

---

## Task 4: ExportModal component

**Files:**
- Create: `components/project/ExportModal.tsx`

No unit tests — this component requires browser drag interaction. It will be validated in Task 5 via integration.

- [ ] **Step 1: Create components/project/ExportModal.tsx**

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'

interface ExportModalProps {
  clipId: string
  startTime: number
  endTime: number
  projectFileUrl: string
  onClose: () => void
}

type ModalState = 'crop' | 'processing' | 'done' | 'error'

export default function ExportModal({ clipId, startTime, endTime, projectFileUrl, onClose }: ExportModalProps) {
  const [state, setState] = useState<ModalState>('crop')
  const [cropX, setCropX] = useState(0.5)
  const [progress, setProgress] = useState(0)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartCropX, setDragStartCropX] = useState(0.5)
  const [videoNaturalWidth, setVideoNaturalWidth] = useState(1920)
  const [videoNaturalHeight, setVideoNaturalHeight] = useState(1080)

  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Pause video at clip start when in crop state
  useEffect(() => {
    if (state === 'crop' && videoRef.current) {
      videoRef.current.currentTime = startTime / 1000
    }
  }, [state, startTime])

  // Progress bar fill during processing
  useEffect(() => {
    if (state !== 'processing') return
    const durationMs = endTime - startTime
    const estimatedMs = Math.max(5000, durationMs / 1000 * 2 * 1000)
    const intervalMs = 100
    const step = (intervalMs / estimatedMs) * 100
    setProgress(0)
    progressIntervalRef.current = setInterval(() => {
      setProgress(p => Math.min(p + step, 95))
    }, intervalMs)
    return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current) }
  }, [state, startTime, endTime])

  // Poll for clip status during processing
  useEffect(() => {
    if (state !== 'processing') return

    const poll = async () => {
      try {
        const res = await fetch(`/api/clips/${clipId}/status`)
        if (!res.ok) {
          pollTimeoutRef.current = setTimeout(poll, 2000)
          return
        }
        const data = await res.json() as { status: string; file_url: string | null }
        if (data.status === 'ready') {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
          setProgress(100)
          setFileUrl(data.file_url)
          setState('done')
        } else if (data.status === 'error') {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
          setErrorMsg('Processing failed on the server.')
          setState('error')
        } else {
          pollTimeoutRef.current = setTimeout(poll, 2000)
        }
      } catch {
        pollTimeoutRef.current = setTimeout(poll, 2000)
      }
    }

    pollTimeoutRef.current = setTimeout(poll, 2000)
    return () => { if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current) }
  }, [state, clipId])

  // Drag: mousemove + mouseup on window
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const containerWidth = containerRef.current.getBoundingClientRect().width
      const aspectRatio = videoNaturalWidth / videoNaturalHeight
      const cropBoxWidthRatio = (9 / 16) / aspectRatio
      const maxPx = containerWidth * (1 - cropBoxWidthRatio)
      if (maxPx <= 0) return
      const delta = (e.clientX - dragStartX) / maxPx
      setCropX(Math.min(1, Math.max(0, dragStartCropX + delta)))
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current || !e.touches[0]) return
      const containerWidth = containerRef.current.getBoundingClientRect().width
      const aspectRatio = videoNaturalWidth / videoNaturalHeight
      const cropBoxWidthRatio = (9 / 16) / aspectRatio
      const maxPx = containerWidth * (1 - cropBoxWidthRatio)
      if (maxPx <= 0) return
      const delta = (e.touches[0].clientX - dragStartX) / maxPx
      setCropX(Math.min(1, Math.max(0, dragStartCropX + delta)))
    }

    const handleUp = () => setIsDragging(false)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [isDragging, dragStartX, dragStartCropX, videoNaturalWidth, videoNaturalHeight])

  const handleGenerate = async () => {
    try {
      const res = await fetch(`/api/clips/${clipId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crop_x: cropX }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setErrorMsg(data.error ?? 'Failed to start generation.')
        setState('error')
        return
      }
      setState('processing')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error')
      setState('error')
    }
  }

  const handleReset = () => {
    setState('crop')
    setCropX(0.5)
    setErrorMsg('')
    setProgress(0)
    setFileUrl(null)
  }

  // Crop box dimensions in display space
  const aspectRatio = videoNaturalWidth / videoNaturalHeight
  const cropBoxWidthRatio = (9 / 16) / aspectRatio // fraction of container width

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: 16,
  }

  const modalStyle: React.CSSProperties = {
    background: '#0F0F1A',
    border: '1px solid rgba(168,85,247,0.2)',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 560,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  }

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#E9D5FF', fontWeight: 700, fontSize: 16, margin: 0 }}>Export Clip</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        </div>

        {/* State: crop selector */}
        {state === 'crop' && (
          <>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>
              Position the crop area for your 9:16 clip
            </p>

            {/* Video + overlay container */}
            <div
              ref={containerRef}
              style={{ position: 'relative', width: '100%', borderRadius: 8, overflow: 'hidden', background: '#000', cursor: 'ew-resize' }}
            >
              <video
                ref={videoRef}
                src={projectFileUrl}
                muted
                playsInline
                preload="metadata"
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget
                  setVideoNaturalWidth(v.videoWidth || 1920)
                  setVideoNaturalHeight(v.videoHeight || 1080)
                  v.currentTime = startTime / 1000
                }}
                style={{ width: '100%', display: 'block' }}
              />

              {/* Dark overlay: left of crop box */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${cropX * (1 - cropBoxWidthRatio) * 100}%`,
                  height: '100%',
                  background: 'rgba(0,0,0,0.55)',
                  pointerEvents: 'none',
                }}
              />

              {/* Crop box (draggable) */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                  setDragStartX(e.clientX)
                  setDragStartCropX(cropX)
                }}
                onTouchStart={(e) => {
                  if (!e.touches[0]) return
                  setIsDragging(true)
                  setDragStartX(e.touches[0].clientX)
                  setDragStartCropX(cropX)
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `${cropX * (1 - cropBoxWidthRatio) * 100}%`,
                  width: `${cropBoxWidthRatio * 100}%`,
                  height: '100%',
                  border: '2px solid #A855F7',
                  boxSizing: 'border-box',
                  cursor: 'ew-resize',
                }}
              />

              {/* Dark overlay: right of crop box */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: `${(1 - cropX * (1 - cropBoxWidthRatio) - cropBoxWidthRatio) * 100}%`,
                  height: '100%',
                  background: 'rgba(0,0,0,0.55)',
                  pointerEvents: 'none',
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #7C3AED, #C026D3)',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              Generate Clip
            </button>
          </>
        )}

        {/* State: processing */}
        {state === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '16px 0' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, margin: 0, fontWeight: 500 }}>
              Generating your clip...
            </p>
            <div style={{ width: '100%' }}>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, height: 6, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #7C3AED, #C026D3)',
                    borderRadius: 8,
                    transition: 'width 0.2s linear',
                  }}
                />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: '6px 0 0', textAlign: 'center' }}>
                {Math.round(progress)}%
              </p>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: 0, textAlign: 'center' }}>
              This usually takes {Math.round((endTime - startTime) / 1000 * 2)} seconds
            </p>
          </div>
        )}

        {/* State: done */}
        {state === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '16px 0' }}>
            <p style={{ color: '#4ADE80', fontSize: 18, fontWeight: 700, margin: 0 }}>
              Your clip is ready!
            </p>
            <a
              href={fileUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                width: '100%',
                padding: '12px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #7C3AED, #C026D3)',
                textAlign: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                textDecoration: 'none',
              }}
            >
              Download
            </a>
            <button
              type="button"
              onClick={handleReset}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: 'rgba(255,255,255,0.4)',
                fontSize: 13,
                padding: '8px 16px',
                cursor: 'pointer',
              }}
            >
              Re-generate
            </button>
          </div>
        )}

        {/* State: error */}
        {state === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '16px 0' }}>
            <p style={{ color: '#F87171', fontSize: 15, fontWeight: 600, margin: 0 }}>
              Generation failed.
            </p>
            {errorMsg && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0, textAlign: 'center' }}>
                {errorMsg}
              </p>
            )}
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                background: 'rgba(168,85,247,0.1)',
                border: '1px solid rgba(168,85,247,0.3)',
                color: '#C084FC',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```
npx tsc --noEmit
```

Expected: no errors related to ExportModal.tsx

- [ ] **Step 3: Commit**

```bash
git add components/project/ExportModal.tsx
git commit -m "feat(module7): add ExportModal component with crop selector and progress tracking"
```

---

## Task 5: ClipsGrid + page.tsx integration

**Files:**
- Modify: `components/project/ClipsGrid.tsx`
- Modify: `app/(dashboard)/projects/[id]/page.tsx`

- [ ] **Step 1: Update ClipsGrid to wire up ExportModal**

Replace the full content of `components/project/ClipsGrid.tsx`:

```tsx
'use client'
import { useState } from 'react'
import ReanalyzeButton from './ReanalyzeButton'
import ExportModal from './ExportModal'

interface Clip {
  id: string
  title: string
  start_time: number
  end_time: number
  virality_score: number
  file_url: string | null
  status: string
}

interface ClipsGridProps {
  projectStatus: string
  projectId: string
  projectFileUrl: string
  clips: Clip[]
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function ClipCard({
  clip,
  projectFileUrl,
}: {
  clip: Clip
  projectFileUrl: string
}) {
  const [showExport, setShowExport] = useState(false)
  const durationMs = clip.end_time - clip.start_time
  const durationSec = Math.round(durationMs / 1000)

  return (
    <>
      <div
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(168,85,247,0.15)',
          borderRadius: 12,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <p style={{ color: '#E9D5FF', fontWeight: 600, fontSize: 14, margin: 0, lineHeight: 1.4 }}>
            {clip.title}
          </p>
          <span
            style={{
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 700,
              color: clip.virality_score >= 0.8 ? '#4ADE80' : clip.virality_score >= 0.6 ? '#FCD34D' : '#C084FC',
              background: clip.virality_score >= 0.8 ? 'rgba(34,197,94,0.1)' : clip.virality_score >= 0.6 ? 'rgba(234,179,8,0.1)' : 'rgba(168,85,247,0.1)',
              padding: '2px 8px',
              borderRadius: 20,
            }}
          >
            {Math.round(clip.virality_score * 100)}%
          </span>
        </div>

        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          <span>⏱ {formatMs(clip.start_time)} – {formatMs(clip.end_time)}</span>
          <span>({durationSec}s)</span>
        </div>

        <button
          type="button"
          onClick={() => setShowExport(true)}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: 8,
            background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(192,38,211,0.15))',
            border: '1px solid rgba(168,85,247,0.3)',
            color: '#C084FC',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Export
        </button>
      </div>

      {showExport && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <ExportModal
            clipId={clip.id}
            startTime={clip.start_time}
            endTime={clip.end_time}
            projectFileUrl={projectFileUrl}
            onClose={() => setShowExport(false)}
          />
        </div>
      )}
    </>
  )
}

export default function ClipsGrid({ projectStatus, projectId, projectFileUrl, clips }: ClipsGridProps) {
  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ color: '#E9D5FF', fontWeight: 600, fontSize: 16, margin: 0 }}>
          AI Clips
        </h3>
        {projectStatus === 'ready' && clips.length > 0 && (
          <ReanalyzeButton projectId={projectId} />
        )}
      </div>

      {projectStatus !== 'ready' ? (
        <div
          style={{
            padding: '32px 24px',
            borderRadius: 16,
            background: 'rgba(255,255,255,0.01)',
            border: '1px dashed rgba(168,85,247,0.15)',
            textAlign: 'center',
          }}
        >
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, margin: 0 }}>
            AI analysis will start once the video is processed.
          </p>
        </div>
      ) : clips.length === 0 ? (
        <div
          style={{
            padding: '32px 24px',
            borderRadius: 16,
            background: 'rgba(255,255,255,0.01)',
            border: '1px dashed rgba(168,85,247,0.15)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, margin: 0 }}>
            Analysis failed
          </p>
          <ReanalyzeButton projectId={projectId} />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}
          className="clips-grid"
        >
          {[...clips].sort((a, b) => b.virality_score - a.virality_score).map((clip) => (
            <ClipCard key={clip.id} clip={clip} projectFileUrl={projectFileUrl} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update page.tsx to select file_url + status from clips and pass projectFileUrl**

In `app/(dashboard)/projects/[id]/page.tsx`, change:

```typescript
const { data: clips } = await supabase
  .from('clips')
  .select('id, title, start_time, end_time, virality_score')
  .eq('project_id', project.id)
  .order('virality_score', { ascending: false })
```

to:

```typescript
const { data: clips } = await supabase
  .from('clips')
  .select('id, title, start_time, end_time, virality_score, status, file_url')
  .eq('project_id', project.id)
  .order('virality_score', { ascending: false })
```

And change the `<ClipsGrid>` call from:

```tsx
<ClipsGrid projectStatus={project.status} projectId={project.id} clips={clips ?? []} />
```

to:

```tsx
<ClipsGrid
  projectStatus={project.status}
  projectId={project.id}
  projectFileUrl={project.file_url ?? ''}
  clips={clips ?? []}
/>
```

- [ ] **Step 3: Run TypeScript check**

```
npx tsc --noEmit
```

Expected: no type errors

- [ ] **Step 4: Run full test suite**

```
npx vitest run
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add components/project/ClipsGrid.tsx app/(dashboard)/projects/[id]/page.tsx
git commit -m "feat(module7): wire ExportModal into ClipsGrid, enable Export button"
```

---

## Post-Implementation: Deploy Worker

After all tasks are done, deploy the Cloudflare Worker:

```bash
cd workers/clip-processor
npm install
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put WORKER_SECRET
npx wrangler deploy
```

Then add to Vercel environment variables:
- `WORKER_URL` = the deployed Worker URL (e.g. `https://viralhook-clip-processor.workers.dev`)
- `WORKER_SECRET` = same secret used above

---

## Environment Variables Summary

| Variable | Where | Value |
|---|---|---|
| `WORKER_URL` | Vercel | Cloudflare Worker URL |
| `WORKER_SECRET` | Vercel + CF Worker secret | Shared random secret |
| `SUPABASE_SERVICE_ROLE_KEY` | CF Worker secret | Supabase service role key |
| `SUPABASE_URL` | `wrangler.toml [vars]` | Supabase project URL |
| `R2_PUBLIC_URL` | `wrangler.toml [vars]` | R2 public base URL |
