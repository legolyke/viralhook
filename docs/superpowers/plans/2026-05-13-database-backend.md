# Module 4 — Database & Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full DB schema (transcripts, clips, exports, subtitles tables) and build the `/projects/[id]` page with video player, inline title editing, delete, and AI clips placeholder.

**Architecture:** Server component fetches project server-side; client sub-components handle interactions (delete confirm modal, inline title edit). API routes at `/api/projects/[id]` handle DELETE (removes from Supabase + R2) and PATCH (rename). All 4 new Supabase tables use RLS with `auth.uid() = user_id`.

**Tech Stack:** Next.js 16 App Router, Supabase SSR, `@aws-sdk/client-s3` (DeleteObjectCommand), Vitest + React Testing Library, TypeScript

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `lib/r2.ts` | Modify | Add `deleteObject(key)` and `getR2KeyFromUrl(fileUrl)` |
| `tests/lib/r2.test.ts` | Create | Unit tests for `getR2KeyFromUrl` |
| `app/api/projects/[id]/route.ts` | Create | DELETE and PATCH handlers |
| `components/project/DeleteConfirmModal.tsx` | Create | Confirmation dialog before delete |
| `components/project/VideoPlayer.tsx` | Create | HTML5 video with processing states |
| `components/project/ClipsGrid.tsx` | Create | AI clips placeholder grid |
| `components/project/ProjectHeader.tsx` | Create | Title (inline edit) + status badge + delete button |
| `app/(dashboard)/projects/[id]/page.tsx` | Create | Project detail server component |

---

## Task 1: SQL Migrations — Run in Supabase

**Files:** None (SQL run in Supabase SQL Editor)

- [ ] **Step 1: Open Supabase SQL Editor**

Go to your Supabase project → SQL Editor → New query.

- [ ] **Step 2: Run transcripts table**

```sql
create table transcripts (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references projects(id) on delete cascade not null,
  user_id         uuid references auth.users(id) on delete cascade not null,
  status          text not null default 'pending',
  provider        text,
  language        text default 'en',
  content         jsonb,
  error_message   text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table transcripts enable row level security;

create policy "Users access own transcripts"
  on transcripts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on table transcripts to authenticated;
```

Expected: "Success. No rows returned."

- [ ] **Step 3: Run clips table**

```sql
create table clips (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references projects(id) on delete cascade not null,
  user_id         uuid references auth.users(id) on delete cascade not null,
  title           text,
  start_time      numeric not null,
  end_time        numeric not null,
  duration        numeric generated always as (end_time - start_time) stored,
  virality_score  numeric,
  hook_text       text,
  status          text not null default 'pending',
  file_url        text,
  thumbnail_url   text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table clips enable row level security;

create policy "Users access own clips"
  on clips for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on table clips to authenticated;
```

Expected: "Success. No rows returned."

- [ ] **Step 4: Run exports table**

```sql
create table exports (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references projects(id) on delete cascade not null,
  clip_id         uuid references clips(id) on delete cascade not null,
  user_id         uuid references auth.users(id) on delete cascade not null,
  status          text not null default 'pending',
  file_url        text,
  format          text default 'mp4',
  resolution      text default '1080x1920',
  has_watermark   boolean default true,
  file_size       bigint,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table exports enable row level security;

create policy "Users access own exports"
  on exports for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on table exports to authenticated;
```

Expected: "Success. No rows returned."

- [ ] **Step 5: Run subtitles table**

```sql
create table subtitles (
  id              uuid primary key default gen_random_uuid(),
  clip_id         uuid references clips(id) on delete cascade not null,
  user_id         uuid references auth.users(id) on delete cascade not null,
  language        text default 'en',
  style           text default 'default',
  content         jsonb not null default '[]'::jsonb,
  created_at      timestamptz default now()
);

alter table subtitles enable row level security;

create policy "Users access own subtitles"
  on subtitles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on table subtitles to authenticated;
```

Expected: "Success. No rows returned."

- [ ] **Step 6: Verify tables exist**

Run:
```sql
select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Expected output includes: `clips`, `exports`, `projects`, `subtitles`, `transcripts`.

---

## Task 2: R2 Utility Functions

**Files:**
- Modify: `lib/r2.ts`
- Create: `tests/lib/r2.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/r2.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock env vars before importing r2
vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'test-account-id')
vi.stubEnv('R2_ACCESS_KEY_ID', 'test-key')
vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret')
vi.stubEnv('R2_BUCKET_NAME', 'test-bucket')
vi.stubEnv('R2_PUBLIC_URL', 'https://pub-abc123.r2.dev')

// Mock the S3Client to avoid real AWS calls
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: vi.fn() })),
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}))
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://presigned.url'),
}))

describe('getR2KeyFromUrl', () => {
  it('extracts key from full public URL', async () => {
    const { getR2KeyFromUrl } = await import('@/lib/r2')
    const url = 'https://pub-abc123.r2.dev/user-id/uuid/video.mp4'
    expect(getR2KeyFromUrl(url)).toBe('user-id/uuid/video.mp4')
  })

  it('handles nested path keys', async () => {
    const { getR2KeyFromUrl } = await import('@/lib/r2')
    const url = 'https://pub-abc123.r2.dev/a/b/c/d.mp4'
    expect(getR2KeyFromUrl(url)).toBe('a/b/c/d.mp4')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/r2.test.ts`

Expected: FAIL — `getR2KeyFromUrl` is not exported from `@/lib/r2`.

- [ ] **Step 3: Add `deleteObject` and `getR2KeyFromUrl` to `lib/r2.ts`**

Current `lib/r2.ts` imports `PutObjectCommand`. Add `DeleteObjectCommand`:

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
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

export function getR2KeyFromUrl(fileUrl: string): string {
  return fileUrl.replace(`${process.env.R2_PUBLIC_URL}/`, '')
}

export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  })
  await r2.send(command)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/r2.test.ts`

Expected: PASS — 2 tests passing.

- [ ] **Step 5: Run all tests to check no regressions**

Run: `npx vitest run`

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/r2.ts tests/lib/r2.test.ts
git commit -m "feat: add deleteObject and getR2KeyFromUrl to r2 client"
```

---

## Task 3: Project API Route (DELETE + PATCH)

**Files:**
- Create: `app/api/projects/[id]/route.ts`

- [ ] **Step 1: Create the route file**

Create `app/api/projects/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteObject, getR2KeyFromUrl } from '@/lib/r2'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('id, file_url, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (project.file_url) {
    try {
      const key = getR2KeyFromUrl(project.file_url)
      await deleteObject(key)
    } catch (err) {
      console.error('[delete] R2 error (non-fatal):', err)
    }
  }

  await supabase.from('projects').delete().eq('id', id).eq('user_id', user.id)

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { title } = body as { title: string }

  if (!title?.trim() || title.trim().length > 100) {
    return NextResponse.json({ error: 'Title must be 1–100 characters' }, { status: 400 })
  }

  const { data: project, error } = await supabase
    .from('projects')
    .update({ title: title.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, title')
    .single()

  if (error || !project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(project)
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/projects/[id]/route.ts
git commit -m "feat: add DELETE and PATCH /api/projects/[id] routes"
```

---

## Task 4: DeleteConfirmModal Component

**Files:**
- Create: `components/project/DeleteConfirmModal.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

interface DeleteConfirmModalProps {
  isOpen: boolean
  projectTitle: string
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmModal({
  isOpen,
  projectTitle,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '0 16px',
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0f0f1a',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 16,
          padding: '28px 24px',
          maxWidth: 400,
          width: '100%',
        }}
      >
        <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>
          Delete project?
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }}>
          <strong style={{ color: '#E9D5FF' }}>{projectTitle}</strong> will be permanently deleted
          including the video file. This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 10,
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#F87171',
              fontWeight: 600,
              fontSize: 14,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.5 : 1,
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/project/DeleteConfirmModal.tsx
git commit -m "feat: add DeleteConfirmModal component"
```

---

## Task 5: VideoPlayer Component

**Files:**
- Create: `components/project/VideoPlayer.tsx`

- [ ] **Step 1: Create the component**

```tsx
interface VideoPlayerProps {
  fileUrl: string
  status: string
}

export default function VideoPlayer({ fileUrl, status }: VideoPlayerProps) {
  if (status === 'uploading' || status === 'processing') {
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(168,85,247,0.1)',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            border: '3px solid rgba(168,85,247,0.2)',
            borderTopColor: '#A855F7',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>
          {status === 'uploading' ? 'Uploading video...' : 'Processing video...'}
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          background: 'rgba(239,68,68,0.04)',
          border: '1px solid rgba(239,68,68,0.15)',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ color: '#F87171', fontSize: 14, margin: 0 }}>
          Processing failed. Please try uploading again.
        </p>
      </div>
    )
  }

  return (
    <video
      src={fileUrl}
      controls
      muted
      playsInline
      style={{
        width: '100%',
        borderRadius: 16,
        background: '#000',
        maxHeight: 480,
      }}
    />
  )
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/project/VideoPlayer.tsx
git commit -m "feat: add VideoPlayer component with processing states"
```

---

## Task 6: ClipsGrid Component

**Files:**
- Create: `components/project/ClipsGrid.tsx`

- [ ] **Step 1: Create the component**

```tsx
interface ClipsGridProps {
  projectStatus: string
}

function SkeletonClipCard({ index }: { index: number }) {
  const labels = ['Hook detected', 'Viral moment', 'Key insight']
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(168,85,247,0.08)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          aspectRatio: '9/16',
          background: 'rgba(168,85,247,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="rgba(168,85,247,0.3)" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75.125v-.375a1.125 1.125 0 0 1 1.125-1.125M21 10.5h.375a1.125 1.125 0 0 1 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H21M4.5 10.5H18V5.625c0-.621-.504-1.125-1.125-1.125H5.625C5.004 4.5 4.5 5.004 4.5 5.625V10.5Z" />
        </svg>
      </div>
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', marginBottom: 4 }}>
          {labels[index % labels.length]}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.15)' }}>
          Waiting for AI...
        </div>
      </div>
    </div>
  )
}

export default function ClipsGrid({ projectStatus }: ClipsGridProps) {
  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ color: '#E9D5FF', fontWeight: 600, fontSize: 16, margin: 0 }}>
          AI Clips
        </h3>
        <span
          style={{
            fontSize: 11,
            padding: '3px 10px',
            borderRadius: 20,
            background: 'rgba(168,85,247,0.1)',
            color: '#C084FC',
          }}
        >
          Coming soon
        </span>
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
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
          }}
          className="clips-grid"
        >
          {[0, 1, 2].map((i) => (
            <SkeletonClipCard key={i} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add responsive CSS for clips grid**

Add to `app/globals.css` inside the `@media (max-width: 768px)` block:

```css
  .clips-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
```

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/project/ClipsGrid.tsx app/globals.css
git commit -m "feat: add ClipsGrid component with placeholder state"
```

---

## Task 7: ProjectHeader Component

**Files:**
- Create: `components/project/ProjectHeader.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DeleteConfirmModal from './DeleteConfirmModal'

interface ProjectHeaderProps {
  id: string
  title: string
  status: string
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  uploading:  { bg: 'rgba(168,85,247,0.1)',  color: '#C084FC' },
  processing: { bg: 'rgba(234,179,8,0.1)',   color: '#FCD34D' },
  ready:      { bg: 'rgba(34,197,94,0.1)',   color: '#4ADE80' },
  error:      { bg: 'rgba(239,68,68,0.1)',   color: '#F87171' },
}

export default function ProjectHeader({ id, title, status }: ProjectHeaderProps) {
  const router = useRouter()
  const [currentTitle, setCurrentTitle] = useState(title)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(title)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.processing

  async function saveTitle() {
    if (!editValue.trim() || editValue.trim() === currentTitle) {
      setEditing(false)
      setEditValue(currentTitle)
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editValue.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setCurrentTitle(data.title)
        setEditValue(data.title)
      }
    } finally {
      setIsSaving(false)
      setEditing(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (res.ok) router.push('/dashboard')
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle()
                if (e.key === 'Escape') { setEditing(false); setEditValue(currentTitle) }
              }}
              disabled={isSaving}
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: '#fff',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(168,85,247,0.4)',
                borderRadius: 8,
                padding: '4px 10px',
                width: '100%',
                outline: 'none',
              }}
            />
          ) : (
            <h1
              onClick={() => setEditing(true)}
              title="Click to rename"
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: '#fff',
                margin: 0,
                cursor: 'text',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentTitle}
            </h1>
          )}
          <span
            style={{
              display: 'inline-block',
              marginTop: 6,
              fontSize: 12,
              padding: '3px 10px',
              borderRadius: 20,
              background: statusStyle.bg,
              color: statusStyle.color,
            }}
          >
            {status}
          </span>
        </div>

        <button
          onClick={() => setShowDeleteModal(true)}
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 8,
            padding: '8px 14px',
            color: '#F87171',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Delete
        </button>
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        projectTitle={currentTitle}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </>
  )
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/project/ProjectHeader.tsx
git commit -m "feat: add ProjectHeader with inline title edit and delete"
```

---

## Task 8: Project Detail Page

**Files:**
- Create: `app/(dashboard)/projects/[id]/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProjectHeader from '@/components/project/ProjectHeader'
import VideoPlayer from '@/components/project/VideoPlayer'
import ClipsGrid from '@/components/project/ClipsGrid'

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

const SOURCE_LABEL: Record<string, string> = {
  file: '📁 File',
  youtube: '📺 YouTube',
  tiktok: '🎵 TikTok',
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/dashboard')

  return (
    <div className="dashboard-content" style={{ maxWidth: 900 }}>
      <Link
        href="/dashboard"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: 'rgba(255,255,255,0.4)',
          textDecoration: 'none',
          marginBottom: 20,
        }}
      >
        ← Back to Dashboard
      </Link>

      <ProjectHeader id={project.id} title={project.title} status={project.status} />

      <VideoPlayer fileUrl={project.file_url ?? ''} status={project.status} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginTop: 16,
        }}
        className="project-meta-grid"
      >
        {[
          { label: 'Source', value: SOURCE_LABEL[project.source] ?? project.source },
          { label: 'Duration', value: formatDuration(project.duration_seconds) },
          { label: 'File size', value: formatSize(project.file_size) },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
              padding: '12px 14px',
            }}
          >
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#E9D5FF' }}>{value}</div>
          </div>
        ))}
      </div>

      <ClipsGrid projectStatus={project.status} />
    </div>
  )
}
```

- [ ] **Step 2: Add responsive CSS for metadata grid**

Add to `app/globals.css` inside the `@media (max-width: 768px)` block:

```css
  .project-meta-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
```

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Test manually**

1. Go to `/dashboard`
2. Click on a project in "Recent Projects" or upload a new video
3. You should land on `/projects/[id]` — no more 404
4. Verify: title is visible and clickable to rename
5. Verify: status badge shows correct color
6. Verify: video player shows (or processing spinner if not ready)
7. Verify: metadata row shows source/duration/size
8. Verify: AI Clips section shows placeholder
9. Click Delete → confirm modal → project deleted → redirect to dashboard

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/projects/[id]/page.tsx" app/globals.css
git commit -m "feat: project detail page with video player, metadata, clips placeholder"
```

---

## Task 9: Update Projects List Page

**Files:**
- Modify: `app/(dashboard)/projects/page.tsx`

- [ ] **Step 1: Update the placeholder page to show real projects**

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import EmptyState from '@/components/dashboard/EmptyState'
import PageHeader from '@/components/dashboard/PageHeader'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, status, created_at, source')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="dashboard-content" style={{ maxWidth: 1200 }}>
      <PageHeader breadcrumb="Projects" title="Projects" description="All your video projects." />

      {!projects || projects.length === 0 ? (
        <EmptyState
          icon={<span style={{ fontSize: 20 }}>🎬</span>}
          title="No projects yet"
          description="Upload your first video to get started."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(168,85,247,0.1)',
                borderRadius: 12,
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                textDecoration: 'none',
                transition: 'border-color 0.15s',
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
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Also make Recent Projects on dashboard link to detail page**

In `app/(dashboard)/dashboard/page.tsx`, wrap each project row in a `<Link href={`/projects/${p.id}`}>`. The current project rows are `<div>` — change the outer div to a `<Link>`:

```tsx
import Link from 'next/link'

// Change:
<div key={p.id} style={{ ... }}>

// To:
<Link key={p.id} href={`/projects/${p.id}`} style={{ ..., textDecoration: 'none' }}>
```

And close with `</Link>` instead of `</div>`.

- [ ] **Step 4: TypeScript check**

Run: `npx tsc --noEmit`

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/projects/page.tsx" "app/(dashboard)/dashboard/page.tsx"
git commit -m "feat: projects list page and dashboard links to project detail"
```
