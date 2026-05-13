# Video Upload System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add fully functional video ingestion to ViralHook — file upload (drag & drop, direct to Cloudflare R2 via presigned URLs with real progress bar) and async URL import (YouTube/TikTok via Railway worker queue).

**Architecture:** Browser validates file client-side, requests a presigned R2 URL from `/api/upload/presign`, uploads directly to R2 with XMLHttpRequest for real progress, then confirms via `/api/upload/confirm`. URL import queues a job to Railway (worker implemented in Module 7) and polls status via Supabase Realtime.

**Tech Stack:** Next.js 16 API Routes, Cloudflare R2 (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`), Supabase (projects table + Realtime), Vitest + React Testing Library for tests.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `lib/upload-validator.ts` | Plan limits, format/duration validation (pure functions) |
| Create | `lib/r2.ts` | Cloudflare R2 client, presigned URL generation |
| Create | `app/api/upload/presign/route.ts` | Generate presigned URL, create project row |
| Create | `app/api/upload/confirm/route.ts` | Update project status after upload |
| Create | `app/api/upload/url-import/route.ts` | Queue Railway job, create project row |
| Create | `components/upload/FileUpload.tsx` | Drag & drop UI, client validation, XHR upload, progress bar |
| Create | `components/upload/UrlImport.tsx` | URL input, Supabase Realtime polling |
| Create | `components/upload/UploadModal.tsx` | Modal with File/URL tab switcher |
| Modify | `app/(dashboard)/dashboard/page.tsx` | Replace UploadZone with UploadModal trigger |
| Create | `vitest.config.ts` | Vitest config with jsdom + path aliases |
| Create | `vitest.setup.ts` | Testing Library matchers setup |
| Create | `tests/lib/upload-validator.test.ts` | Unit tests for validator |

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install R2 SDK and Vitest**

```bash
cd D:\CLAUDE\proiecte\viralhook
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Add test script to package.json**

Open `package.json` and add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Verify install**

```bash
npm list @aws-sdk/client-s3 @aws-sdk/s3-request-presigner vitest
```

Expected: all three listed without errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add R2 SDK and Vitest dependencies"
```

---

## Task 2: Vitest configuration

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Create vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 2: Create vitest.setup.ts**

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Run empty test suite to verify config**

```bash
npm test
```

Expected output: `No test files found` or `0 tests`. No errors.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts vitest.setup.ts
git commit -m "chore: configure Vitest with jsdom and Testing Library"
```

---

## Task 3: Supabase — create projects table

**Files:** (SQL run in Supabase Dashboard → SQL Editor)

- [ ] **Step 1: Open Supabase SQL Editor**

Go to: https://supabase.com/dashboard/project/qkkltpkbfsotgxcgkbme/sql/new

- [ ] **Step 2: Run migration**

```sql
create table projects (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  title            text not null,
  status           text not null default 'uploading',
  file_url         text,
  file_size        bigint,
  duration_seconds integer,
  source           text not null default 'file',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table projects enable row level security;

create policy "Users manage own projects"
  on projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

- [ ] **Step 3: Enable Realtime on projects table**

In Supabase Dashboard: **Database → Replication → Tables → Toggle ON for `projects`**

This is required for URL import status polling.

- [ ] **Step 4: Verify table exists**

Run in SQL Editor:
```sql
select column_name, data_type from information_schema.columns
where table_name = 'projects' order by ordinal_position;
```

Expected: 9 rows (id, user_id, title, status, file_url, file_size, duration_seconds, source, created_at, updated_at).

---

## Task 4: lib/upload-validator.ts (TDD)

**Files:**
- Create: `lib/upload-validator.ts`
- Create: `tests/lib/upload-validator.test.ts`

- [ ] **Step 1: Write failing tests first**

Create `tests/lib/upload-validator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  validateFileFormat,
  validateDuration,
  PLAN_LIMITS,
  ACCEPTED_EXTENSIONS,
} from '@/lib/upload-validator'

describe('validateFileFormat', () => {
  it('accepts .mp4 files', () => {
    expect(validateFileFormat('video.mp4').valid).toBe(true)
  })

  it('accepts .MP4 files (case insensitive)', () => {
    expect(validateFileFormat('video.MP4').valid).toBe(true)
  })

  it('accepts .mov files', () => {
    expect(validateFileFormat('video.mov').valid).toBe(true)
  })

  it('rejects .avi files', () => {
    const result = validateFileFormat('video.avi')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Only MP4 and MOV files are supported.')
  })

  it('rejects .mkv files', () => {
    expect(validateFileFormat('video.mkv').valid).toBe(false)
  })
})

describe('validateDuration', () => {
  it('allows FREE plan video under 30 min', () => {
    expect(validateDuration(1700, 'free').valid).toBe(true)
  })

  it('rejects FREE plan video over 30 min', () => {
    const result = validateDuration(1801, 'free')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('FREE')
    expect(result.error).toContain('30 min')
  })

  it('allows CREATOR plan video up to 2h', () => {
    expect(validateDuration(7200, 'creator').valid).toBe(true)
  })

  it('rejects CREATOR plan video over 2h', () => {
    const result = validateDuration(7201, 'creator')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('2h')
  })

  it('allows PRO plan video up to 4h', () => {
    expect(validateDuration(14400, 'pro').valid).toBe(true)
  })

  it('rejects PRO plan video over 4h', () => {
    const result = validateDuration(14401, 'pro')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('4h')
  })

  it('allows AGENCY plan video up to 6h', () => {
    expect(validateDuration(21600, 'agency').valid).toBe(true)
  })

  it('rejects AGENCY plan video over 6h', () => {
    expect(validateDuration(21601, 'agency').valid).toBe(false)
  })
})

describe('PLAN_LIMITS', () => {
  it('has correct seconds for free plan', () => {
    expect(PLAN_LIMITS.free.maxDurationSeconds).toBe(30 * 60)
  })

  it('has correct seconds for creator plan', () => {
    expect(PLAN_LIMITS.creator.maxDurationSeconds).toBe(2 * 60 * 60)
  })

  it('has correct seconds for pro plan', () => {
    expect(PLAN_LIMITS.pro.maxDurationSeconds).toBe(4 * 60 * 60)
  })

  it('has correct seconds for agency plan', () => {
    expect(PLAN_LIMITS.agency.maxDurationSeconds).toBe(6 * 60 * 60)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: `Cannot find module '@/lib/upload-validator'`

- [ ] **Step 3: Implement lib/upload-validator.ts**

```typescript
// lib/upload-validator.ts
export const PLAN_LIMITS = {
  free:    { maxDurationSeconds: 30 * 60 },
  creator: { maxDurationSeconds: 2 * 60 * 60 },
  pro:     { maxDurationSeconds: 4 * 60 * 60 },
  agency:  { maxDurationSeconds: 6 * 60 * 60 },
} as const

export type Plan = keyof typeof PLAN_LIMITS

export const ACCEPTED_EXTENSIONS = ['.mp4', '.mov']

export function validateFileFormat(fileName: string): { valid: boolean; error?: string } {
  const ext = '.' + (fileName.split('.').pop() ?? '').toLowerCase()
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: 'Only MP4 and MOV files are supported.' }
  }
  return { valid: true }
}

export function validateDuration(
  durationSeconds: number,
  plan: Plan
): { valid: boolean; error?: string } {
  const limit = PLAN_LIMITS[plan].maxDurationSeconds
  if (durationSeconds > limit) {
    const hours = limit / 3600
    const limitLabel = hours >= 1 ? `${hours}h` : `${Math.round(limit / 60)} min`
    return {
      valid: false,
      error: `Your ${plan.toUpperCase()} plan supports max ${limitLabel} videos. Upgrade to upload longer content.`,
    }
  }
  return { valid: true }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test
```

Expected: `16 tests passed`

- [ ] **Step 5: Commit**

```bash
git add lib/upload-validator.ts tests/lib/upload-validator.test.ts
git commit -m "feat: add upload validator with plan limits (TDD)"
```

---

## Task 5: Cloudflare R2 setup + lib/r2.ts

**Files:**
- Create: `lib/r2.ts`
- Modify: `.env.local`

- [ ] **Step 1: Create R2 bucket in Cloudflare Dashboard**

1. Go to: https://dash.cloudflare.com → **R2 Object Storage → Create bucket**
2. Bucket name: `viralhook-videos`
3. Location: Auto

- [ ] **Step 2: Configure CORS on the bucket**

In the bucket → **Settings → CORS Policy** → Add:

```json
[
  {
    "AllowedOrigins": [
      "https://viralhook-chi.vercel.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

- [ ] **Step 3: Create R2 API token**

Cloudflare Dashboard → **R2 → Manage R2 API tokens → Create API token**
- Permissions: `Object Read & Write`
- Specific bucket: `viralhook-videos`
- Copy: **Access Key ID** and **Secret Access Key**

- [ ] **Step 4: Get public URL (optional but recommended)**

In bucket settings → **Public access → Allow Access** → copy the public URL (format: `https://pub-xxx.r2.dev`).

If not enabling public access, use the bucket domain format: `https://<account-id>.r2.cloudflarestorage.com/viralhook-videos`

- [ ] **Step 5: Add env vars to .env.local**

Open `.env.local` and add:

```env
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_r2_access_key_here
R2_SECRET_ACCESS_KEY=your_r2_secret_key_here
R2_BUCKET_NAME=viralhook-videos
R2_PUBLIC_URL=https://pub-xxx.r2.dev
RAILWAY_WORKER_URL=
RAILWAY_WORKER_SECRET=
```

- [ ] **Step 6: Add same env vars to Vercel**

Vercel Dashboard → viralhook project → **Settings → Environment Variables** → add all 6 vars above.

- [ ] **Step 7: Create lib/r2.ts**

```typescript
// lib/r2.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(r2, command, { expiresIn })
}

export function getPublicUrl(key: string): string {
  return `${process.env.R2_PUBLIC_URL}/${key}`
}
```

- [ ] **Step 8: Commit**

```bash
git add lib/r2.ts .env.local
git commit -m "feat: add Cloudflare R2 client"
```

Note: `.env.local` is in `.gitignore` — only `lib/r2.ts` will be committed.

---

## Task 6: API Route — /api/upload/presign

**Files:**
- Create: `app/api/upload/presign/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/upload/presign/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePresignedUploadUrl, getPublicUrl } from '@/lib/r2'
import { validateFileFormat, validateDuration } from '@/lib/upload-validator'
import type { Plan } from '@/lib/upload-validator'
import { randomUUID } from 'crypto'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { fileName, fileType, durationSeconds, title } = body as {
    fileName: string
    fileType: string
    durationSeconds: number
    title: string
  }

  // All users are on FREE plan until Module 11 (Stripe subscriptions)
  const plan: Plan = 'free'

  const formatCheck = validateFileFormat(fileName)
  if (!formatCheck.valid) {
    return NextResponse.json({ error: formatCheck.error }, { status: 400 })
  }

  const durationCheck = validateDuration(durationSeconds, plan)
  if (!durationCheck.valid) {
    return NextResponse.json({ error: durationCheck.error }, { status: 400 })
  }

  const key = `${user.id}/${randomUUID()}/${fileName}`
  const presignedUrl = await generatePresignedUploadUrl(key, fileType)
  const fileUrl = getPublicUrl(key)

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      title: title || fileName,
      status: 'uploading',
      file_url: fileUrl,
      source: 'file',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }

  return NextResponse.json({ presignedUrl, projectId: project.id })
}
```

- [ ] **Step 2: Test manually with curl (after dev server is running)**

```bash
npm run dev
```

In a separate terminal:
```bash
curl -X POST http://localhost:3000/api/upload/presign \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.mp4","fileType":"video/mp4","durationSeconds":60,"title":"Test"}'
```

Expected: `{"error":"Unauthorized"}` (no session yet — that's correct).

- [ ] **Step 3: Commit**

```bash
git add app/api/upload/presign/route.ts
git commit -m "feat: add presigned URL API route for R2 upload"
```

---

## Task 7: API Route — /api/upload/confirm

**Files:**
- Create: `app/api/upload/confirm/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/upload/confirm/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId, fileSize, durationSeconds } = await request.json() as {
    projectId: string
    fileSize: number
    durationSeconds: number
  }

  const { error } = await supabase
    .from('projects')
    .update({
      status: 'processing',
      file_size: fileSize,
      duration_seconds: Math.round(durationSeconds),
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to confirm upload' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/upload/confirm/route.ts
git commit -m "feat: add upload confirm API route"
```

---

## Task 8: API Route — /api/upload/url-import

**Files:**
- Create: `app/api/upload/url-import/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/upload/url-import/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/
const TIKTOK_REGEX = /^(https?:\/\/)?(www\.)?tiktok\.com\/.+\/video\/\d+/

function detectSource(url: string): 'youtube' | 'tiktok' | null {
  if (YOUTUBE_REGEX.test(url)) return 'youtube'
  if (TIKTOK_REGEX.test(url)) return 'tiktok'
  return null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { url } = await request.json() as { url: string }
  const source = detectSource(url)
  if (!source) {
    return NextResponse.json({ error: 'Invalid YouTube or TikTok URL' }, { status: 400 })
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      title: `Import from ${source === 'youtube' ? 'YouTube' : 'TikTok'}`,
      status: 'uploading',
      source,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }

  // Notify Railway worker if configured (worker implemented in Module 7)
  const workerUrl = process.env.RAILWAY_WORKER_URL
  if (workerUrl) {
    fetch(`${workerUrl}/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-worker-secret': process.env.RAILWAY_WORKER_SECRET ?? '',
      },
      body: JSON.stringify({ projectId: project.id, url, userId: user.id }),
    }).catch(() => {
      // Worker unavailable — project stays as 'uploading', retried in Module 7
    })
  }

  return NextResponse.json({ projectId: project.id })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/upload/url-import/route.ts
git commit -m "feat: add URL import API route (queues Railway job)"
```

---

## Task 9: components/upload/FileUpload.tsx

**Files:**
- Create: `components/upload/FileUpload.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/upload/FileUpload.tsx
'use client'

import { useState, useRef, useCallback, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { validateFileFormat, validateDuration } from '@/lib/upload-validator'
import type { Plan } from '@/lib/upload-validator'

interface FileUploadProps {
  userPlan?: Plan
  onClose?: () => void
}

type UploadStatus = 'idle' | 'validating' | 'uploading' | 'confirming' | 'done'

async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }
    video.onerror = () => resolve(0)
    video.src = URL.createObjectURL(file)
  })
}

async function uploadWithProgress(
  file: File,
  presignedUrl: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error('Upload failed')))
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.open('PUT', presignedUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}

export default function FileUpload({ userPlan = 'free', onClose }: FileUploadProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setStatus('validating')

    const formatCheck = validateFileFormat(file.name)
    if (!formatCheck.valid) {
      setError(formatCheck.error!)
      setStatus('idle')
      return
    }

    const durationSeconds = await getVideoDuration(file)
    const durationCheck = validateDuration(durationSeconds, userPlan)
    if (!durationCheck.valid) {
      setError(durationCheck.error!)
      setStatus('idle')
      return
    }

    setStatus('uploading')
    setProgress(0)

    try {
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || 'video/mp4',
          durationSeconds,
          title: file.name.replace(/\.[^/.]+$/, ''),
        }),
      })
      if (!presignRes.ok) {
        const data = await presignRes.json()
        throw new Error(data.error ?? 'Failed to prepare upload')
      }
      const { presignedUrl, projectId } = await presignRes.json()

      await uploadWithProgress(file, presignedUrl, setProgress)

      setStatus('confirming')
      const confirmRes = await fetch('/api/upload/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, fileSize: file.size, durationSeconds }),
      })
      if (!confirmRes.ok) throw new Error('Failed to finalize upload')

      setStatus('done')
      router.push(`/projects/${projectId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setStatus('idle')
      setProgress(null)
    }
  }, [userPlan, router])

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)

  const statusLabel: Record<UploadStatus, string> = {
    idle: '',
    validating: 'Validating file...',
    uploading: `Uploading... ${progress ?? 0}%`,
    confirming: 'Finalizing...',
    done: 'Done!',
  }

  const isActive = status !== 'idle'

  return (
    <div>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !isActive && inputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#A855F7' : 'rgba(168,85,247,0.3)'}`,
          borderRadius: 16,
          padding: '40px 24px',
          textAlign: 'center',
          cursor: isActive ? 'default' : 'pointer',
          background: isDragging ? 'rgba(168,85,247,0.06)' : 'rgba(255,255,255,0.01)',
          transition: 'all 0.2s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.mov,video/mp4,video/quicktime"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />

        {!isActive ? (
          <>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎬</div>
            <p style={{ color: '#E9D5FF', fontWeight: 600, marginBottom: 4 }}>
              Drag & drop your video here
            </p>
            <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>
              MP4 or MOV · Max{' '}
              {userPlan === 'free' ? '30 min' :
               userPlan === 'creator' ? '2h' :
               userPlan === 'pro' ? '4h' : '6h'}
            </p>
            <button
              type="button"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #C026D3)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '10px 24px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Browse files
            </button>
          </>
        ) : (
          <div>
            <p style={{ color: '#C084FC', fontWeight: 600, marginBottom: 12 }}>
              {statusLabel[status]}
            </p>
            {progress !== null && (
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #7C3AED, #C026D3)',
                    transition: 'width 0.2s',
                    borderRadius: 8,
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p style={{ color: '#F87171', fontSize: 13, marginTop: 10, textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/upload/FileUpload.tsx
git commit -m "feat: add FileUpload component with drag & drop, progress bar"
```

---

## Task 10: components/upload/UrlImport.tsx

**Files:**
- Create: `components/upload/UrlImport.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/upload/UrlImport.tsx
'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/[\w-]+|tiktok\.com\/.+\/video\/\d+)/

const STATUS_LABELS: Record<string, string> = {
  uploading: 'Downloading video...',
  processing: 'Processing...',
  ready: 'Done! Redirecting...',
  error: 'Import failed.',
}

export default function UrlImport() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!URL_REGEX.test(url)) {
      setError('Please enter a valid YouTube or TikTok URL')
      return
    }

    setIsSubmitting(true)
    const res = await fetch('/api/upload/url-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Import failed')
      setIsSubmitting(false)
      return
    }

    const data = await res.json()
    setProjectId(data.projectId)
    setImportStatus('uploading')
    setIsSubmitting(false)
  }

  useEffect(() => {
    if (!projectId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`project-status-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`,
        },
        (payload) => {
          const newStatus = payload.new.status as string
          setImportStatus(newStatus)
          if (newStatus === 'ready') {
            router.push(`/projects/${projectId}`)
          }
          if (newStatus === 'error') {
            setError('Download failed. The video may be private or unavailable.')
            setProjectId(null)
            setImportStatus(null)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId, router])

  return (
    <div>
      {!projectId ? (
        <form onSubmit={handleSubmit}>
          <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 12 }}>
            Paste a YouTube or TikTok link to import the video.
          </p>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=... or https://tiktok.com/..."
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(168,85,247,0.25)',
              color: '#fff',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: 12,
            }}
          />
          <button
            type="submit"
            disabled={isSubmitting || !url.trim()}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 12,
              background: isSubmitting ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg, #7C3AED, #C026D3)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: 15,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Queuing...' : 'Import Video'}
          </button>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
          <p style={{ color: '#C084FC', fontWeight: 600 }}>
            {importStatus ? STATUS_LABELS[importStatus] ?? importStatus : 'Queuing...'}
          </p>
          <p style={{ color: '#6B7280', fontSize: 13, marginTop: 8 }}>
            This may take a few minutes. You can close this and check Projects.
          </p>
        </div>
      )}

      {error && (
        <p style={{ color: '#F87171', fontSize: 13, marginTop: 10, textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/upload/UrlImport.tsx
git commit -m "feat: add UrlImport component with Supabase Realtime polling"
```

---

## Task 11: components/upload/UploadModal.tsx

**Files:**
- Create: `components/upload/UploadModal.tsx`

- [ ] **Step 1: Create the modal**

```typescript
// components/upload/UploadModal.tsx
'use client'

import { useState, useEffect } from 'react'
import FileUpload from './FileUpload'
import UrlImport from './UrlImport'

type Tab = 'file' | 'url'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('file')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      />
      <div style={{
        position: 'relative',
        background: '#0b0b14',
        border: '1px solid rgba(168,85,247,0.25)',
        borderRadius: 24,
        padding: '32px',
        width: '100%',
        maxWidth: 520,
        boxShadow: '0 0 60px rgba(168,85,247,0.12)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>
            New Project
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4 }}>
          {(['file', 'url'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 10,
                background: activeTab === tab ? 'rgba(168,85,247,0.15)' : 'transparent',
                border: activeTab === tab ? '1px solid rgba(168,85,247,0.35)' : '1px solid transparent',
                color: activeTab === tab ? '#C084FC' : '#6B7280',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: activeTab === tab ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {tab === 'file' ? '📁 Upload File' : '🔗 Import URL'}
            </button>
          ))}
        </div>

        {activeTab === 'file' ? (
          <FileUpload onClose={onClose} />
        ) : (
          <UrlImport />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/upload/UploadModal.tsx
git commit -m "feat: add UploadModal with file/URL tab switcher"
```

---

## Task 12: Update dashboard page

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Read current file**

Open `app/(dashboard)/dashboard/page.tsx` and note the current content.

- [ ] **Step 2: Replace with updated dashboard**

```typescript
// app/(dashboard)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StatsCard from '@/components/dashboard/StatsCard'
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'
import DashboardUploadTrigger from '@/components/dashboard/DashboardUploadTrigger'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, status, created_at, source')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const firstName = user.email?.split('@')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200 }}>
      <PageHeader
        title={`${greeting}, ${firstName} 👋`}
        description="Create viral shorts from your long-form content."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, margin: '32px 0' }}>
        <StatsCard label="Exports used" value={0} limit={3} unit="exports" />
        <StatsCard label="Video processed" value={0} limit={30} unit="min" />
        <StatsCard label="Projects" value={projects?.length ?? 0} />
        <StatsCard label="Plan" value="FREE" />
      </div>

      <DashboardUploadTrigger />

      <div style={{ marginTop: 40 }}>
        <h3 style={{ color: '#E9D5FF', fontWeight: 600, fontSize: 16, marginBottom: 16 }}>
          Recent Projects
        </h3>
        {!projects || projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Upload your first video to get started."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {projects.map((p) => (
              <div
                key={p.id}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(168,85,247,0.1)',
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ color: '#E9D5FF', fontWeight: 500, margin: 0 }}>{p.title}</p>
                  <p style={{ color: '#6B7280', fontSize: 12, margin: '4px 0 0' }}>
                    {p.source === 'youtube' ? '📺 YouTube' : p.source === 'tiktok' ? '🎵 TikTok' : '📁 File'} ·{' '}
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span style={{
                  fontSize: 12,
                  padding: '4px 10px',
                  borderRadius: 20,
                  background: p.status === 'ready' ? 'rgba(34,197,94,0.1)' :
                               p.status === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(168,85,247,0.1)',
                  color: p.status === 'ready' ? '#4ADE80' :
                         p.status === 'error' ? '#F87171' : '#C084FC',
                }}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create DashboardUploadTrigger client component**

This is a client component that holds modal state — needed because the dashboard page is a server component.

```typescript
// components/dashboard/DashboardUploadTrigger.tsx
'use client'

import { useState } from 'react'
import UploadModal from '@/components/upload/UploadModal'

export default function DashboardUploadTrigger() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div
        onClick={() => setIsOpen(true)}
        style={{
          border: '2px dashed rgba(168,85,247,0.3)',
          borderRadius: 16,
          padding: '36px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: 'rgba(255,255,255,0.01)',
          transition: 'border-color 0.2s, background 0.2s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(168,85,247,0.6)'
          ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(168,85,247,0.04)'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(168,85,247,0.3)'
          ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.01)'
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 10 }}>🎬</div>
        <p style={{ color: '#E9D5FF', fontWeight: 600, margin: '0 0 4px' }}>
          Upload or import a video
        </p>
        <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>
          MP4 or MOV · Or paste a YouTube / TikTok link
        </p>
      </div>

      <UploadModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/dashboard/page.tsx components/dashboard/DashboardUploadTrigger.tsx
git commit -m "feat: update dashboard with upload trigger and projects list"
```

---

## Task 13: Push to GitHub and verify Vercel deploy

- [ ] **Step 1: Push all commits**

```bash
git push origin main
```

- [ ] **Step 2: Verify Vercel build**

Go to: https://vercel.com/dashboard → viralhook project → Deployments

Wait for build to complete. Expected: ✅ green build.

- [ ] **Step 3: Add env vars to Vercel (if not done in Task 5)**

Vercel Dashboard → Settings → Environment Variables. Ensure all R2 vars are present:
- `CLOUDFLARE_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`
- `RAILWAY_WORKER_URL` (empty string for now)
- `RAILWAY_WORKER_SECRET` (empty string for now)

- [ ] **Step 4: Smoke test on production**

1. Go to https://viralhook-chi.vercel.app/login → login
2. On dashboard → click the upload zone → modal opens ✅
3. Tab "Upload File" → drag a small test .mp4 → progress bar appears ✅
4. Upload completes → redirects to `/projects/[id]` ✅
5. Back on dashboard → project shows in Recent Projects list ✅
6. Tab "Import URL" → paste `https://www.youtube.com/watch?v=dQw4w9WgXcQ` → click Import ✅
7. Status shows "Downloading video..." (job queued, worker not live yet — status stays as uploading) ✅

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: production smoke test fixes"
git push origin main
```

---

## Notes for Future Modules

- **Module 7 (Auto Video Clipping):** Set up Railway worker that listens for jobs, runs `yt-dlp`, uploads to R2, updates project status via Supabase Admin client.
- **Module 11 (Stripe):** Replace hardcoded `const plan: Plan = 'free'` in `presign/route.ts` with a lookup from the subscriptions table.
- **Module 13 (Analytics):** `projects` table `status` + `duration_seconds` are the base data for analytics.
