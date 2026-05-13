# Speech-to-Text Engine Implementation Plan (Module 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically transcribe video audio with AssemblyAI when a project is confirmed uploaded, store word-level transcript with viral highlights, and display it on the project detail page.

**Architecture:** `/api/upload/confirm` triggers an async AssemblyAI transcription job (fire-and-forget, ~1-2s). AssemblyAI processes the video independently and POSTs to `/api/transcribe/webhook` when done. The webhook saves the transcript to Supabase and sets project status to `ready`, which Supabase Realtime delivers to any listening browser clients.

**Tech Stack:** AssemblyAI REST API v2, Next.js App Router API routes, Supabase (service role client for webhook), React Server Components

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `lib/assemblyai.ts` | Create | AssemblyAI API client: startTranscription, getTranscript, verifyWebhookSecret |
| `lib/supabase/server.ts` | Modify | Add createServiceClient for webhook (bypasses RLS) |
| `app/api/transcribe/webhook/route.ts` | Create | Receive AssemblyAI completion, save transcript, update project status |
| `app/api/upload/confirm/route.ts` | Modify | Trigger transcription after upload confirmed |
| `components/project/VideoPlayer.tsx` | Modify | Add 'transcribing' spinner state |
| `components/project/TranscriptPanel.tsx` | Create | Display transcript text with viral highlights |
| `app/(dashboard)/projects/[id]/page.tsx` | Modify | Fetch transcript, render TranscriptPanel |
| `tests/lib/assemblyai.test.ts` | Create | Unit tests for AssemblyAI client functions |

---

## Task 1: SQL Migration + Environment Variables

**Files:**
- Supabase SQL editor (migration)
- `.env.local` (local env)
- Vercel dashboard (production env)

- [ ] **Step 1: Run SQL migration in Supabase**

Go to Supabase dashboard → SQL Editor → New query, paste and run:

```sql
ALTER TABLE projects ADD COLUMN transcript_job_id TEXT;
```

Expected: "Success. No rows returned."

- [ ] **Step 2: Generate webhook secret**

Run in terminal (PowerShell):

```powershell
! node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output (64-char hex string). This is your `ASSEMBLYAI_WEBHOOK_SECRET`.

- [ ] **Step 3: Get Supabase service role key**

Go to Supabase dashboard → Project Settings → API → copy the `service_role` key (starts with `eyJ...`).

- [ ] **Step 4: Add to .env.local**

Run (replace values with your actual keys):

```
! echo ASSEMBLYAI_WEBHOOK_SECRET=your_hex_secret_here >> .env.local
! echo SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here >> .env.local
```

- [ ] **Step 5: Add to Vercel**

Go to vercel.com → viralhook project → Settings → Environment Variables. Add both:
- `ASSEMBLYAI_WEBHOOK_SECRET` = (same hex secret)
- `SUPABASE_SERVICE_ROLE_KEY` = (service role key)

Both: Production + Preview + Development.

- [ ] **Step 6: Commit migration note**

```bash
git add .
git commit -m "chore: add transcript_job_id column migration"
```

---

## Task 2: AssemblyAI Client Library

**Files:**
- Create: `lib/assemblyai.ts`
- Create: `tests/lib/assemblyai.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/assemblyai.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.hoisted(() => vi.fn())
vi.stubGlobal('fetch', mockFetch)

import { startTranscription, getTranscript, verifyWebhookSecret } from '@/lib/assemblyai'

describe('startTranscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('ASSEMBLYAI_API_KEY', 'test-key')
    vi.stubEnv('ASSEMBLYAI_WEBHOOK_SECRET', 'test-secret')
  })

  it('returns job id on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'job_abc123' }),
    })
    const id = await startTranscription(
      'https://r2.example.com/video.mp4',
      'https://app.example.com/api/transcribe/webhook'
    )
    expect(id).toBe('job_abc123')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.assemblyai.com/v2/transcript',
      expect.objectContaining({ method: 'POST' })
    )
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.audio_url).toBe('https://r2.example.com/video.mp4')
    expect(body.auto_highlights).toBe(true)
    expect(body.webhook_url).toBe('https://app.example.com/api/transcribe/webhook')
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    })
    await expect(
      startTranscription('https://r2.example.com/video.mp4', 'https://app.example.com/api/transcribe/webhook')
    ).rejects.toThrow('AssemblyAI error 401')
  })
})

describe('getTranscript', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('ASSEMBLYAI_API_KEY', 'test-key')
  })

  it('returns transcript on success', async () => {
    const mockTranscript = {
      id: 'job_abc123',
      status: 'completed',
      text: 'Hello world',
      words: [{ text: 'Hello', start: 0, end: 500, confidence: 0.99 }],
      auto_highlights_result: { results: [] },
      language_code: 'en',
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscript,
    })
    const result = await getTranscript('job_abc123')
    expect(result.id).toBe('job_abc123')
    expect(result.text).toBe('Hello world')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.assemblyai.com/v2/transcript/job_abc123',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'test-key' }) })
    )
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'Not found' })
    await expect(getTranscript('bad_id')).rejects.toThrow('AssemblyAI error 404')
  })
})

describe('verifyWebhookSecret', () => {
  it('returns true when secrets match', () => {
    expect(verifyWebhookSecret('my-secret', 'my-secret')).toBe(true)
  })

  it('returns false when secrets differ', () => {
    expect(verifyWebhookSecret('wrong', 'my-secret')).toBe(false)
  })

  it('returns false when provided is null', () => {
    expect(verifyWebhookSecret(null, 'my-secret')).toBe(false)
  })

  it('returns false when either is empty string', () => {
    expect(verifyWebhookSecret('', 'my-secret')).toBe(false)
    expect(verifyWebhookSecret('my-secret', '')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npx vitest run tests/lib/assemblyai.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/assemblyai'"

- [ ] **Step 3: Create lib/assemblyai.ts**

```typescript
const ASSEMBLYAI_BASE = 'https://api.assemblyai.com/v2'

export interface AssemblyAIWord {
  text: string
  start: number
  end: number
  confidence: number
}

export interface AssemblyAIHighlight {
  text: string
  rank: number
  timestamps: Array<{ start: number; end: number }>
}

export interface AssemblyAITranscript {
  id: string
  status: string
  text: string
  words: AssemblyAIWord[]
  auto_highlights_result: { results: AssemblyAIHighlight[] } | null
  language_code: string
}

export async function startTranscription(
  audioUrl: string,
  webhookUrl: string
): Promise<string> {
  const res = await fetch(`${ASSEMBLYAI_BASE}/transcript`, {
    method: 'POST',
    headers: {
      Authorization: process.env.ASSEMBLYAI_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      auto_highlights: true,
      webhook_url: webhookUrl,
      webhook_auth_header_name: 'x-assemblyai-secret',
      webhook_auth_header_value: process.env.ASSEMBLYAI_WEBHOOK_SECRET,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AssemblyAI error ${res.status}: ${text}`)
  }
  const data = await res.json() as { id: string }
  return data.id
}

export async function getTranscript(transcriptId: string): Promise<AssemblyAITranscript> {
  const res = await fetch(`${ASSEMBLYAI_BASE}/transcript/${transcriptId}`, {
    headers: { Authorization: process.env.ASSEMBLYAI_API_KEY! },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AssemblyAI error ${res.status}: ${text}`)
  }
  return res.json() as Promise<AssemblyAITranscript>
}

export function verifyWebhookSecret(provided: string | null, expected: string): boolean {
  if (!provided || !expected) return false
  return provided === expected
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npx vitest run tests/lib/assemblyai.test.ts
```

Expected: PASS — 8 tests

- [ ] **Step 5: Commit**

```bash
git add lib/assemblyai.ts tests/lib/assemblyai.test.ts
git commit -m "feat: AssemblyAI client — startTranscription, getTranscript, verifyWebhookSecret"
```

---

## Task 3: Supabase Service Client

**Files:**
- Modify: `lib/supabase/server.ts`

The webhook has no user session, so it uses the service role key to bypass RLS.

- [ ] **Step 1: Add createServiceClient to lib/supabase/server.ts**

Current file content:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

Replace the entire `lib/supabase/server.ts` with:

```typescript
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/server.ts
git commit -m "feat: add createServiceClient to supabase server lib"
```

---

## Task 4: Webhook Endpoint

**Files:**
- Create: `app/api/transcribe/webhook/route.ts`

- [ ] **Step 1: Create the webhook route**

Create `app/api/transcribe/webhook/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getTranscript, verifyWebhookSecret } from '@/lib/assemblyai'
import { createServiceClient } from '@/lib/supabase/server'

interface WebhookPayload {
  transcript_id: string
  status: 'completed' | 'error'
}

export async function POST(request: Request) {
  const secret = request.headers.get('x-assemblyai-secret')
  if (!verifyWebhookSecret(secret, process.env.ASSEMBLYAI_WEBHOOK_SECRET!)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: WebhookPayload
  try {
    payload = await request.json() as WebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { transcript_id, status } = payload
  const supabase = createServiceClient()

  if (status === 'error') {
    await supabase
      .from('projects')
      .update({ status: 'error', updated_at: new Date().toISOString() })
      .eq('transcript_job_id', transcript_id)
    return NextResponse.json({ ok: true })
  }

  if (status !== 'completed') {
    return NextResponse.json({ ok: true })
  }

  let transcript
  try {
    transcript = await getTranscript(transcript_id)
  } catch (err) {
    console.error('Failed to fetch transcript from AssemblyAI:', err)
    return NextResponse.json({ error: 'Failed to fetch transcript' }, { status: 500 })
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, user_id')
    .eq('transcript_job_id', transcript_id)
    .single()

  if (!project) {
    console.error('No project found for transcript_job_id:', transcript_id)
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const { error: insertError } = await supabase.from('transcripts').insert({
    project_id: project.id,
    user_id: project.user_id,
    full_text: transcript.text,
    content: {
      words: transcript.words ?? [],
      auto_highlights: transcript.auto_highlights_result?.results ?? [],
    },
    language: transcript.language_code ?? 'en',
  })

  if (insertError) {
    console.error('Failed to save transcript:', insertError)
    return NextResponse.json({ error: 'Failed to save transcript' }, { status: 500 })
  }

  await supabase
    .from('projects')
    .update({ status: 'ready', updated_at: new Date().toISOString() })
    .eq('id', project.id)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Run TypeScript check**

```
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/transcribe/webhook/route.ts
git commit -m "feat: AssemblyAI webhook handler — saves transcript, updates project status"
```

---

## Task 5: Update Confirm Route to Trigger Transcription

**Files:**
- Modify: `app/api/upload/confirm/route.ts`

Current file (`app/api/upload/confirm/route.ts`):

```typescript
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

- [ ] **Step 1: Replace confirm route with transcription trigger**

Replace the entire file with:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startTranscription } from '@/lib/assemblyai'

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

  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('file_url')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !project?.file_url) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
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

  const origin = new URL(request.url).origin
  const webhookUrl = `${origin}/api/transcribe/webhook`

  try {
    const jobId = await startTranscription(project.file_url, webhookUrl)
    await supabase
      .from('projects')
      .update({
        status: 'transcribing',
        transcript_job_id: jobId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
  } catch (err) {
    console.error('Failed to start transcription:', err)
    // Non-fatal: upload is confirmed, transcription can be retried
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Run TypeScript check**

```
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/upload/confirm/route.ts
git commit -m "feat: trigger AssemblyAI transcription after upload confirm"
```

---

## Task 6: Update VideoPlayer — Add Transcribing State

**Files:**
- Modify: `components/project/VideoPlayer.tsx`

- [ ] **Step 1: Add transcribing state to VideoPlayer**

Current file is `components/project/VideoPlayer.tsx`. Replace the first conditional block (lines 7-38) to add `transcribing`:

```typescript
interface VideoPlayerProps {
  fileUrl: string
  status: string
}

const SPINNER_STATUSES: Record<string, string> = {
  uploading: 'Uploading video...',
  processing: 'Processing video...',
  transcribing: 'Transcribing audio...',
}

export default function VideoPlayer({ fileUrl, status }: VideoPlayerProps) {
  if (status in SPINNER_STATUSES) {
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
          {SPINNER_STATUSES[status]}
        </p>
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
      aria-label="Project video"
      style={{
        width: '100%',
        borderRadius: 16,
        background: '#000',
        maxHeight: 480,
      }}
    >
      Your browser does not support video playback.
    </video>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/project/VideoPlayer.tsx
git commit -m "feat: add transcribing spinner state to VideoPlayer"
```

---

## Task 7: TranscriptPanel Component

**Files:**
- Create: `components/project/TranscriptPanel.tsx`

- [ ] **Step 1: Create TranscriptPanel**

Create `components/project/TranscriptPanel.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { AssemblyAIHighlight } from '@/lib/assemblyai'

interface TranscriptData {
  full_text: string
  content: {
    words: Array<{ text: string; start: number; end: number; confidence: number }>
    auto_highlights: AssemblyAIHighlight[]
  }
  language: string
}

interface TranscriptPanelProps {
  status: string
  transcript: TranscriptData | null
}

function applyHighlights(fullText: string, highlights: AssemblyAIHighlight[]): React.ReactNode {
  const topPhrases = highlights
    .filter(h => h.rank > 0.7)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 8)
    .map(h => h.text)

  if (topPhrases.length === 0) return fullText

  const escaped = topPhrases.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = fullText.split(pattern)

  return (
    <>
      {parts.map((part, i) => {
        const isHighlight = topPhrases.some(p => p.toLowerCase() === part.toLowerCase())
        return isHighlight ? (
          <mark
            key={i}
            style={{
              background: 'rgba(168,85,247,0.22)',
              borderBottom: '1px solid rgba(168,85,247,0.55)',
              borderRadius: 3,
              padding: '0 2px',
              color: '#E9D5FF',
            }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      })}
    </>
  )
}

export default function TranscriptPanel({ status, transcript }: TranscriptPanelProps) {
  const [expanded, setExpanded] = useState(true)

  if (status === 'transcribing') {
    return (
      <div
        style={{
          marginTop: 20,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(168,85,247,0.12)',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            border: '2px solid rgba(168,85,247,0.3)',
            borderTopColor: '#A855F7',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            flexShrink: 0,
          }}
        />
        <div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500, margin: 0 }}>
            Transcribing audio...
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '2px 0 0' }}>
            This may take a few minutes.
          </p>
        </div>
      </div>
    )
  }

  if (!transcript?.full_text) return null

  const highlights = transcript.content?.auto_highlights ?? []
  const highlightCount = highlights.filter(h => h.rank > 0.7).length

  return (
    <div
      style={{
        marginTop: 20,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.7)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Transcript</span>
          {highlightCount > 0 && (
            <span
              style={{
                fontSize: 11,
                padding: '2px 7px',
                borderRadius: 20,
                background: 'rgba(168,85,247,0.15)',
                border: '1px solid rgba(168,85,247,0.3)',
                color: '#C084FC',
                fontWeight: 500,
              }}
            >
              {highlightCount} viral moment{highlightCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <svg
          width="14"
          height="14"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div style={{ padding: '0 20px 16px' }}>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.75,
              color: 'rgba(255,255,255,0.6)',
              margin: 0,
            }}
          >
            {applyHighlights(transcript.full_text, highlights)}
          </p>
          {highlightCount > 0 && (
            <p style={{ fontSize: 11, color: 'rgba(168,85,247,0.6)', marginTop: 10, marginBottom: 0 }}>
              Highlighted phrases detected as high viral potential by AI
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/project/TranscriptPanel.tsx
git commit -m "feat: TranscriptPanel component with viral highlight rendering"
```

---

## Task 8: Update Project Detail Page

**Files:**
- Modify: `app/(dashboard)/projects/[id]/page.tsx`

- [ ] **Step 1: Replace project detail page**

Replace the entire file `app/(dashboard)/projects/[id]/page.tsx` with:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ProjectHeader from '@/components/project/ProjectHeader'
import VideoPlayer from '@/components/project/VideoPlayer'
import ClipsGrid from '@/components/project/ClipsGrid'
import TranscriptPanel from '@/components/project/TranscriptPanel'

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
    .select('id, title, status, file_url, source, duration_seconds, file_size')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!project) redirect('/dashboard')

  const { data: transcript } = await supabase
    .from('transcripts')
    .select('full_text, content, language')
    .eq('project_id', project.id)
    .maybeSingle()

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

      <TranscriptPanel status={project.status} transcript={transcript} />

      <ClipsGrid projectStatus={project.status} />
    </div>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Run all tests**

```
npx vitest run
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/projects/[id]/page.tsx
git commit -m "feat: show TranscriptPanel on project detail page"
```

---

## Task 9: Final Push

- [ ] **Step 1: Run full TypeScript check one more time**

```
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 2: Run all tests**

```
npx vitest run
```

Expected: all pass

- [ ] **Step 3: Ask user before pushing**

Report: "All done. Ask user: Vrei să dau push?"
