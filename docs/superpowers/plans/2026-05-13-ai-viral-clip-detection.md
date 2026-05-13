# AI Viral Clip Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically detect 3-5 viral clip moments from a video transcript using GPT-4o-mini and display them as clip cards on the project detail page.

**Architecture:** After a transcript is saved (via webhook or retry-transcription), `detectViralClips()` from `lib/openai.ts` is called synchronously. It sends word timestamps + auto-highlights to GPT-4o-mini, parses the response, and returns structured clip data. The caller inserts clips into the `clips` table before setting project status to `ready`.

**Tech Stack:** OpenAI API (GPT-4o-mini, raw fetch — no SDK), Supabase (existing), Next.js App Router API routes, Vitest for unit tests.

---

## Prerequisites

Before starting Task 1, add `OPENAI_API_KEY` to `.env.local`:
```
OPENAI_API_KEY=sk-...
```
Also add it to Vercel → Settings → Environment Variables.

---

### Task 1: OpenAI client — `lib/openai.ts`

**Files:**
- Create: `lib/openai.ts`
- Create: `tests/lib/openai.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/openai.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.hoisted(() => vi.fn())
vi.stubGlobal('fetch', mockFetch)

import { detectViralClips } from '@/lib/openai'

const mockWords = [
  { text: 'Hello', start: 200, end: 800, confidence: 0.99 },
  { text: 'world', start: 900, end: 1400, confidence: 0.98 },
  { text: 'this', start: 1500, end: 1700, confidence: 0.97 },
  { text: 'is', start: 1800, end: 1900, confidence: 0.96 },
  { text: 'amazing', start: 2000, end: 2800, confidence: 0.95 },
]
const mockHighlights = [
  { text: 'Hello world', rank: 0.9, timestamps: [{ start: 200, end: 1400 }] },
]

const mockClipsResponse = {
  clips: [
    { title: 'Amazing moment', hook: 'Hello world', start_ms: 200, end_ms: 20000, score: 0.9 },
  ],
}

describe('detectViralClips', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('OPENAI_API_KEY', 'sk-test-key')
  })

  it('throws if OPENAI_API_KEY is not set', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    await expect(detectViralClips(mockWords, mockHighlights, 'Hello world this is amazing'))
      .rejects.toThrow('OPENAI_API_KEY is not set')
  })

  it('returns parsed clips on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockClipsResponse) } }],
      }),
    })
    const clips = await detectViralClips(mockWords, mockHighlights, 'Hello world this is amazing')
    expect(clips).toHaveLength(1)
    expect(clips[0].title).toBe('Amazing moment')
    expect(clips[0].start_ms).toBe(200)
    expect(clips[0].score).toBe(0.9)
  })

  it('calls gpt-4o-mini with correct model', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockClipsResponse) } }],
      }),
    })
    await detectViralClips(mockWords, mockHighlights, 'Hello world')
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.model).toBe('gpt-4o-mini')
    expect(body.response_format).toEqual({ type: 'json_object' })
  })

  it('throws on OpenAI API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    })
    await expect(detectViralClips(mockWords, mockHighlights, 'Hello world'))
      .rejects.toThrow('OpenAI error 429')
  })

  it('throws on invalid JSON response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'not json at all' } }],
      }),
    })
    await expect(detectViralClips(mockWords, mockHighlights, 'Hello world'))
      .rejects.toThrow('invalid JSON')
  })

  it('throws when clips array is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ result: [] }) } }],
      }),
    })
    await expect(detectViralClips(mockWords, mockHighlights, 'Hello world'))
      .rejects.toThrow('missing clips array')
  })

  it('filters out clips with duration under 5 seconds', async () => {
    const response = {
      clips: [
        { title: 'Good clip', hook: 'hook', start_ms: 0, end_ms: 30000, score: 0.8 },
        { title: 'Too short', hook: 'hook', start_ms: 0, end_ms: 3000, score: 0.9 },
      ],
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(response) } }] }),
    })
    const clips = await detectViralClips(mockWords, mockHighlights, 'Hello world')
    expect(clips).toHaveLength(1)
    expect(clips[0].title).toBe('Good clip')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/openai.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/openai'`

- [ ] **Step 3: Create `lib/openai.ts`**

```typescript
import type { AssemblyAIWord, AssemblyAIHighlight } from '@/lib/assemblyai'

const OPENAI_BASE = 'https://api.openai.com/v1'

export interface DetectedClip {
  title: string
  hook: string
  start_ms: number
  end_ms: number
  score: number
}

export async function detectViralClips(
  words: AssemblyAIWord[],
  highlights: AssemblyAIHighlight[],
  fullText: string
): Promise<DetectedClip[]> {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set')

  const wordsCompact = words.map(w => ({ t: w.text, s: w.start, e: w.end }))
  const highlightsCompact = highlights.slice(0, 20).map(h => ({ text: h.text, rank: h.rank }))

  const systemPrompt = `You are a viral content expert. Analyze video transcripts to identify the most engaging moments for TikTok, Reels, and YouTube Shorts. Return ONLY valid JSON.`

  const userPrompt = `Analyze this video transcript and identify 3-5 viral clip moments.

Full text:
${fullText}

Word timestamps (t=text, s=start_ms, e=end_ms):
${JSON.stringify(wordsCompact)}

Viral phrases detected (hints, ranked 0-1):
${JSON.stringify(highlightsCompact)}

Return a JSON object: {"clips": [...]}

Each clip must have:
- "title": catchy title, max 60 chars
- "hook": opening line that hooks viewers, max 100 chars
- "start_ms": clip start in milliseconds (use a real "s" value from word timestamps)
- "end_ms": clip end in milliseconds (use a real "e" value from word timestamps)
- "score": virality score 0.0-1.0

Rules:
- 3-5 clips total
- Each clip duration: 15000-60000ms
- No overlapping clips
- Prioritize: emotional moments, humor, surprise, quotable phrases`

  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI error ${res.status}: ${text}`)
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  const content = data.choices[0]?.message?.content
  if (!content) throw new Error('OpenAI returned empty response')

  let parsed: { clips: DetectedClip[] }
  try {
    parsed = JSON.parse(content) as { clips: DetectedClip[] }
  } catch {
    throw new Error('OpenAI returned invalid JSON')
  }

  if (!Array.isArray(parsed.clips)) throw new Error('OpenAI response missing clips array')

  return parsed.clips.filter(
    (clip) =>
      typeof clip.title === 'string' &&
      typeof clip.start_ms === 'number' &&
      typeof clip.end_ms === 'number' &&
      typeof clip.score === 'number' &&
      clip.end_ms - clip.start_ms >= 5000
  )
}
```

- [ ] **Step 4: Run tests — all must pass**

```bash
npx vitest run tests/lib/openai.test.ts
```
Expected: 7 tests PASS

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```
Expected: all tests pass (previous 29 + 7 new = 36 total)

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add lib/openai.ts tests/lib/openai.test.ts
git commit -m "feat: OpenAI client — detectViralClips with GPT-4o-mini"
```

---

### Task 2: Integrate clip detection into webhook

**Files:**
- Modify: `app/api/transcribe/webhook/route.ts`

- [ ] **Step 1: Add import at the top of `app/api/transcribe/webhook/route.ts`**

After the existing imports, add:
```typescript
import { detectViralClips } from '@/lib/openai'
```

- [ ] **Step 2: Add clip detection block before the `ready` status update**

The current file ends with:
```typescript
  const { error: readyErr } = await supabase
    .from('projects')
    .update({ status: 'ready', updated_at: new Date().toISOString() })
    .eq('id', project.id)

  if (readyErr) {
    console.error('Failed to set project ready status:', readyErr)
    return NextResponse.json({ error: 'Failed to update project status' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
```

Replace that block with:
```typescript
  // Detect viral clips (non-fatal — project still becomes ready if this fails)
  try {
    const words = transcript.words ?? []
    const highlights = transcript.auto_highlights_result?.results ?? []
    if (words.length > 0) {
      const clips = await detectViralClips(words, highlights, transcript.text ?? '')
      if (clips.length > 0) {
        await supabase.from('clips').insert(
          clips.map((clip) => ({
            project_id: project.id,
            user_id: project.user_id,
            start_ms: Math.round(clip.start_ms),
            end_ms: Math.round(clip.end_ms),
            title: clip.title,
            score: clip.score,
            status: 'detected',
          }))
        )
      }
    }
  } catch (err) {
    console.error('Failed to detect viral clips:', err)
  }

  const { error: readyErr } = await supabase
    .from('projects')
    .update({ status: 'ready', updated_at: new Date().toISOString() })
    .eq('id', project.id)

  if (readyErr) {
    console.error('Failed to set project ready status:', readyErr)
    return NextResponse.json({ error: 'Failed to update project status' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/api/transcribe/webhook/route.ts
git commit -m "feat: detect viral clips in AssemblyAI webhook after transcript saved"
```

---

### Task 3: Integrate clip detection into retry-transcription

**Files:**
- Modify: `app/api/projects/[id]/retry-transcription/route.ts`

- [ ] **Step 1: Add import at the top**

After the existing imports, add:
```typescript
import { detectViralClips } from '@/lib/openai'
```

- [ ] **Step 2: Replace the `completed` block**

Current `completed` block:
```typescript
  if (transcript.status === 'completed') {
    const { error: insertError } = await supabase.from('transcripts').insert({
      project_id: project.id,
      user_id: user.id,
      full_text: transcript.text,
      content: { words: transcript.words ?? [], auto_highlights: transcript.auto_highlights_result?.results ?? [] },
      language: transcript.language_code ?? 'en',
    })
    if (insertError && !insertError.message.includes('duplicate')) {
      return NextResponse.json({ error: `Failed to save transcript: ${insertError.message}` }, { status: 500 })
    }
    await supabase.from('projects').update({ status: 'ready', updated_at: new Date().toISOString() }).eq('id', project.id)
    return NextResponse.json({ status: 'ready', message: 'Transcript recovered successfully.' })
  }
```

Replace with:
```typescript
  if (transcript.status === 'completed') {
    const { error: insertError } = await supabase.from('transcripts').insert({
      project_id: project.id,
      user_id: user.id,
      full_text: transcript.text,
      content: { words: transcript.words ?? [], auto_highlights: transcript.auto_highlights_result?.results ?? [] },
      language: transcript.language_code ?? 'en',
    })
    if (insertError && !insertError.message.includes('duplicate')) {
      return NextResponse.json({ error: `Failed to save transcript: ${insertError.message}` }, { status: 500 })
    }

    // Detect viral clips (non-fatal)
    try {
      const words = transcript.words ?? []
      const highlights = transcript.auto_highlights_result?.results ?? []
      if (words.length > 0) {
        const clips = await detectViralClips(words, highlights, transcript.text ?? '')
        if (clips.length > 0) {
          await supabase.from('clips').insert(
            clips.map((clip) => ({
              project_id: project.id,
              user_id: user.id,
              start_ms: Math.round(clip.start_ms),
              end_ms: Math.round(clip.end_ms),
              title: clip.title,
              score: clip.score,
              status: 'detected',
            }))
          )
        }
      }
    } catch (err) {
      console.error('Failed to detect viral clips:', err)
    }

    await supabase.from('projects').update({ status: 'ready', updated_at: new Date().toISOString() }).eq('id', project.id)
    return NextResponse.json({ status: 'ready', message: 'Transcript recovered successfully.' })
  }
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add "app/api/projects/[id]/retry-transcription/route.ts"
git commit -m "feat: detect viral clips in retry-transcription after transcript saved"
```

---

### Task 4: Manual re-analyze endpoint

**Files:**
- Create: `app/api/projects/[id]/detect-clips/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { detectViralClips } from '@/lib/openai'
import type { AssemblyAIWord, AssemblyAIHighlight } from '@/lib/assemblyai'

interface TranscriptContent {
  words: AssemblyAIWord[]
  auto_highlights: AssemblyAIHighlight[]
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('id, user_id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (project.status !== 'ready') {
    return NextResponse.json({ error: 'Project must be ready before re-analyzing' }, { status: 400 })
  }

  const { data: transcriptRow } = await supabase
    .from('transcripts')
    .select('full_text, content')
    .eq('project_id', id)
    .maybeSingle()

  if (!transcriptRow) return NextResponse.json({ error: 'No transcript found for this project' }, { status: 404 })

  const content = transcriptRow.content as TranscriptContent
  const words = content?.words ?? []
  const highlights = content?.auto_highlights ?? []

  if (words.length === 0) {
    return NextResponse.json({ error: 'Transcript has no word timestamps' }, { status: 400 })
  }

  let clips
  try {
    clips = await detectViralClips(words, highlights, transcriptRow.full_text ?? '')
  } catch (err) {
    return NextResponse.json(
      { error: `Clip detection failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }

  // Delete existing clips for this project before inserting new ones
  await supabase.from('clips').delete().eq('project_id', id).eq('user_id', user.id)

  if (clips.length > 0) {
    const { error: insertError } = await supabase.from('clips').insert(
      clips.map((clip) => ({
        project_id: project.id,
        user_id: user.id,
        start_ms: Math.round(clip.start_ms),
        end_ms: Math.round(clip.end_ms),
        title: clip.title,
        score: clip.score,
        status: 'detected',
      }))
    )
    if (insertError) {
      return NextResponse.json({ error: `Failed to save clips: ${insertError.message}` }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, count: clips.length })
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "app/api/projects/[id]/detect-clips/route.ts"
git commit -m "feat: detect-clips endpoint for manual re-analysis"
```

---

### Task 5: Update ClipsGrid + project detail page

**Files:**
- Modify: `components/project/ClipsGrid.tsx`
- Create: `components/project/ReanalyzeButton.tsx`
- Modify: `app/(dashboard)/projects/[id]/page.tsx`

- [ ] **Step 1: Create `components/project/ReanalyzeButton.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ReanalyzeButton({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReanalyze() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/detect-clips`, { method: 'POST' })
      const data = await res.json() as { ok?: boolean; count?: number; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Re-analysis failed')
      } else {
        router.refresh()
      }
    } catch {
      setError('Request failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <button
        type="button"
        onClick={handleReanalyze}
        disabled={loading}
        style={{
          padding: '8px 20px',
          borderRadius: 8,
          background: 'rgba(168,85,247,0.1)',
          border: '1px solid rgba(168,85,247,0.25)',
          color: '#C084FC',
          fontSize: 13,
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Analyzing...' : '🔄 Re-analyze'}
      </button>
      {error && (
        <p style={{ color: '#F87171', fontSize: 12, marginTop: 8 }}>{error}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `components/project/ClipsGrid.tsx`**

```typescript
import ReanalyzeButton from './ReanalyzeButton'

interface Clip {
  id: string
  title: string
  start_ms: number
  end_ms: number
  score: number
}

interface ClipsGridProps {
  projectStatus: string
  projectId: string
  clips: Clip[]
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function ClipCard({ clip }: { clip: Clip }) {
  const durationMs = clip.end_ms - clip.start_ms
  const durationSec = Math.round(durationMs / 1000)

  return (
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
            color: clip.score >= 0.8 ? '#4ADE80' : clip.score >= 0.6 ? '#FCD34D' : '#C084FC',
            background: clip.score >= 0.8 ? 'rgba(34,197,94,0.1)' : clip.score >= 0.6 ? 'rgba(234,179,8,0.1)' : 'rgba(168,85,247,0.1)',
            padding: '2px 8px',
            borderRadius: 20,
          }}
        >
          {Math.round(clip.score * 100)}%
        </span>
      </div>

      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
        <span>⏱ {formatMs(clip.start_ms)} – {formatMs(clip.end_ms)}</span>
        <span>({durationSec}s)</span>
      </div>

      <button
        type="button"
        disabled
        style={{
          width: '100%',
          padding: '8px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.25)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'not-allowed',
        }}
      >
        Export — Coming soon
      </button>
    </div>
  )
}

export default function ClipsGrid({ projectStatus, projectId, clips }: ClipsGridProps) {
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
            Clip analysis did not produce results.
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
          {clips.sort((a, b) => b.score - a.score).map((clip) => (
            <ClipCard key={clip.id} clip={clip} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Update `app/(dashboard)/projects/[id]/page.tsx` to fetch clips and pass them**

Add clips fetch after the transcript fetch:
```typescript
  const { data: clips } = await supabase
    .from('clips')
    .select('id, title, start_ms, end_ms, score')
    .eq('project_id', project.id)
    .order('score', { ascending: false })
```

Update the `<ClipsGrid>` line from:
```typescript
      <ClipsGrid projectStatus={project.status} />
```
to:
```typescript
      <ClipsGrid projectStatus={project.status} projectId={project.id} clips={clips ?? []} />
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```
Expected: all tests pass

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add components/project/ClipsGrid.tsx components/project/ReanalyzeButton.tsx "app/(dashboard)/projects/[id]/page.tsx"
git commit -m "feat: ClipsGrid with real clip cards + ReanalyzeButton"
```
