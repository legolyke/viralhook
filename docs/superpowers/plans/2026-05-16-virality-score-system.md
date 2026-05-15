# Virality Score System (Module 12) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend each detected clip with a 4-component virality breakdown (Hook, Emotion, Pacing, Shareability), each with a score and plain-English reason, stored in a new DB column and displayed as expandable chips on each clip card.

**Architecture:** Extend the existing `detectViralClips()` GPT call to return a `breakdown` object alongside the current `score`. Store breakdown in a new `score_breakdown JSONB` column on `clips`. Display as 4 inline chips below the timing row on each ClipCard — clicking a chip opens a dropdown with the component definition and the specific reason for that clip.

**Tech Stack:** TypeScript, Supabase (SQL migration), Next.js API route, React (ClipsGrid), Vitest

---

## File Map

| File | Change |
|------|--------|
| `lib/openai.ts` | Add `ScoreComponent`, `ScoreBreakdown`, `ScoreBreakdownMap` types; extend `DetectedClip`; extend prompt; add breakdown validation |
| `app/api/projects/[id]/detect-clips/route.ts` | Add `score_breakdown` to DB insert |
| `app/(dashboard)/projects/[id]/page.tsx` | Add `score_breakdown` to clips select |
| `components/project/ClipsGrid.tsx` | Add `score_breakdown` to `Clip` interface; add chip row + dropdown UI |
| `tests/lib/openai.test.ts` | Update mock response + add 3 new tests for breakdown parsing |

---

## Task 1: Supabase DB Migration

**Files:**
- No code files — run SQL directly in Supabase dashboard

- [ ] **Step 1: Run migration in Supabase SQL Editor**

Go to Supabase → SQL Editor and run:

```sql
ALTER TABLE clips ADD COLUMN IF NOT EXISTS score_breakdown JSONB;
```

- [ ] **Step 2: Verify column exists**

Run in SQL Editor:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'clips' AND column_name = 'score_breakdown';
```
Expected: one row with `column_name = score_breakdown`, `data_type = jsonb`.

---

## Task 2: Extend lib/openai.ts — types, prompt, parsing

**Files:**
- Modify: `lib/openai.ts`
- Test: `tests/lib/openai.test.ts`

- [ ] **Step 1: Write failing tests first**

Open `tests/lib/openai.test.ts`. At the top, update `mockClipsResponse` to include breakdown:

```typescript
const mockClipsResponse = {
  clips: [
    {
      title: 'Amazing moment',
      start_ms: 200,
      end_ms: 20000,
      score: 0.9,
      breakdown: {
        hook:          { score: 0.95, reason: 'Opens with a bold claim that demands attention' },
        emotion:       { score: 0.88, reason: 'High energy delivery conveys genuine excitement' },
        pacing:        { score: 0.85, reason: 'Fast cuts maintain engagement throughout' },
        shareability:  { score: 0.90, reason: 'Relatable scenario most viewers will forward' },
      },
    },
  ],
}
```

Add these three tests inside the existing `describe('detectViralClips', ...)` block:

```typescript
it('returns breakdown on each clip', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(mockClipsResponse) } }],
    }),
  })
  const clips = await detectViralClips(mockWords, mockHighlights, 'Hello world')
  expect(clips[0].breakdown).toBeDefined()
  expect(clips[0].breakdown!.hook.score).toBe(0.95)
  expect(clips[0].breakdown!.hook.reason).toBe('Opens with a bold claim that demands attention')
  expect(clips[0].breakdown!.shareability.score).toBe(0.90)
})

it('sets breakdown to null when GPT returns no breakdown', async () => {
  const noBreakdown = {
    clips: [{ title: 'Clip', start_ms: 0, end_ms: 20000, score: 0.8 }],
  }
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(noBreakdown) } }],
    }),
  })
  const clips = await detectViralClips(mockWords, mockHighlights, 'Hello world')
  expect(clips[0].breakdown).toBeNull()
})

it('sets breakdown to null when a component score is out of range', async () => {
  const badBreakdown = {
    clips: [{
      title: 'Clip', start_ms: 0, end_ms: 20000, score: 0.8,
      breakdown: {
        hook:         { score: 1.5, reason: 'Too high' },
        emotion:      { score: 0.8, reason: 'Fine' },
        pacing:       { score: 0.7, reason: 'Fine' },
        shareability: { score: 0.6, reason: 'Fine' },
      },
    }],
  }
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(badBreakdown) } }],
    }),
  })
  const clips = await detectViralClips(mockWords, mockHighlights, 'Hello world')
  expect(clips[0].breakdown).toBeNull()
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npx vitest run tests/lib/openai.test.ts
```
Expected: 3 new tests FAIL (breakdown not yet on DetectedClip).

- [ ] **Step 3: Implement in lib/openai.ts**

Replace the existing `DetectedClip` interface and `detectViralClips` function body in `lib/openai.ts` with:

```typescript
export interface ScoreComponent {
  score: number   // 0.0–1.0
  reason: string  // 1-2 sentences
}

export interface ScoreBreakdown {
  hook:          ScoreComponent
  emotion:       ScoreComponent
  pacing:        ScoreComponent
  shareability:  ScoreComponent
}

export interface DetectedClip {
  title:     string
  start_ms:  number
  end_ms:    number
  score:     number
  breakdown: ScoreBreakdown | null
}

function validateBreakdown(raw: unknown): ScoreBreakdown | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  const keys = ['hook', 'emotion', 'pacing', 'shareability'] as const
  const result = {} as ScoreBreakdown
  for (const key of keys) {
    const comp = b[key]
    if (!comp || typeof comp !== 'object') return null
    const c = comp as Record<string, unknown>
    if (typeof c.score !== 'number' || c.score < 0 || c.score > 1) return null
    if (typeof c.reason !== 'string' || !c.reason) return null
    result[key] = { score: c.score, reason: c.reason }
  }
  return result
}
```

In the `userPrompt` string, replace the "Each clip must have:" section with:

```typescript
  const userPrompt = `Analyze this video transcript and identify viral clip moments.

Full transcript:
${truncatedText}

Video duration: ${videoDurationMs}ms (${Math.round(videoDurationMs / 1000)} seconds)

Timeline — what is said around each 5-second mark:
${JSON.stringify(timeline)}

Viral phrases detected (hints):
${JSON.stringify(highlightsCompact)}

Return a JSON object: {"clips": [...]}

Each clip must have:
- "title": catchy title, max 60 chars
- "start_ms": use a time_ms value from the timeline above as the clip start
- "end_ms": use a time_ms value from the timeline above as the clip end (must be at least 3 entries after start_ms)
- "score": overall virality score 0.0-1.0 (weighted average of breakdown scores)
- "breakdown": object with exactly four keys, each having "score" (0.0-1.0) and "reason" (1-2 sentences in English):
  - "hook": how strong the opening seconds are at grabbing attention
  - "emotion": how much emotion and energy the clip conveys
  - "pacing": how well-timed the clip is — not too slow, not too fast
  - "shareability": how likely viewers are to share or forward this clip

Rules:
- start_ms MUST be less than end_ms
- end_ms - start_ms MUST be between 15000 and 60000 (15 to 60 seconds)
- No overlapping clips
- Return 1-5 clips (1 clip is fine for a short video)
- Prioritize: emotional moments, humor, surprise, quotable phrases`
```

Also bump `max_tokens` from `1000` to `2000` in the fetch body (breakdown adds ~400 tokens for 5 clips).

In the normalization `.map()` callback, add breakdown:

```typescript
  const normalized = parsed.clips
    .filter(
      (clip) =>
        typeof clip.title === 'string' &&
        typeof clip.start_ms === 'number' &&
        typeof clip.end_ms === 'number' &&
        typeof clip.score === 'number' &&
        clip.score >= 0 && clip.score <= 1
    )
    .map((clip) => ({
      title:    clip.title,
      start_ms: Math.min(clip.start_ms, clip.end_ms),
      end_ms:   Math.max(clip.start_ms, clip.end_ms),
      score:    clip.score,
      breakdown: validateBreakdown((clip as Record<string, unknown>).breakdown),
    }))
    .filter(
      (clip) =>
        clip.end_ms - clip.start_ms >= 15000 &&
        clip.end_ms - clip.start_ms <= 60000
    )
```

- [ ] **Step 4: Run tests**

```
npx vitest run tests/lib/openai.test.ts
```
Expected: all tests pass (existing 8 + new 3 = 11 total).

- [ ] **Step 5: TypeScript check**

```
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```
git add lib/openai.ts tests/lib/openai.test.ts
git commit -m "feat(module12): extend detectViralClips with score breakdown"
```

---

## Task 3: Save breakdown in detect-clips route

**Files:**
- Modify: `app/api/projects/[id]/detect-clips/route.ts`

- [ ] **Step 1: Add score_breakdown to the insert**

In `app/api/projects/[id]/detect-clips/route.ts`, update the `clips.map()` inside the insert call:

```typescript
    const { error: insertError } = await supabase.from('clips').insert(
      clips.map((clip) => ({
        project_id: project.id,
        user_id: user.id,
        start_time: Math.round(clip.start_ms),
        end_time: Math.round(clip.end_ms),
        title: clip.title,
        virality_score: clip.score,
        score_breakdown: clip.breakdown ?? null,
        status: 'detected',
      }))
    )
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```
git add app/api/projects/[id]/detect-clips/route.ts
git commit -m "feat(module12): save score_breakdown to clips table"
```

---

## Task 4: Add score_breakdown to project page query

**Files:**
- Modify: `app/(dashboard)/projects/[id]/page.tsx`

- [ ] **Step 1: Add score_breakdown to the select**

In `app/(dashboard)/projects/[id]/page.tsx`, find this line (around line 57):

```typescript
    .select('id, title, start_time, end_time, virality_score, status, file_url')
```

Replace with:

```typescript
    .select('id, title, start_time, end_time, virality_score, score_breakdown, status, file_url')
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```
git add "app/(dashboard)/projects/[id]/page.tsx"
git commit -m "feat(module12): include score_breakdown in clips query"
```

---

## Task 5: ClipsGrid UI — breakdown chips + dropdown

**Files:**
- Modify: `components/project/ClipsGrid.tsx`

- [ ] **Step 1: Update Clip interface and ClipsGrid props**

At the top of `components/project/ClipsGrid.tsx`, replace the existing `Clip` interface:

```typescript
interface ScoreComponent {
  score: number
  reason: string
}

interface ScoreBreakdown {
  hook:          ScoreComponent
  emotion:       ScoreComponent
  pacing:        ScoreComponent
  shareability:  ScoreComponent
}

interface Clip {
  id: string
  title: string
  start_time: number
  end_time: number
  virality_score: number
  score_breakdown: ScoreBreakdown | null
  file_url: string | null
  status: string
}
```

- [ ] **Step 2: Add constants and state**

At the top of the `ClipCard` function body (after existing state declarations), add:

```typescript
  const [activeBreakdown, setActiveBreakdown] = useState<string | null>(null)

  const BREAKDOWN_LABELS: Record<string, string> = {
    hook: 'Hook', emotion: 'Emotion', pacing: 'Pacing', shareability: 'Share',
  }

  const BREAKDOWN_DEFS: Record<string, string> = {
    hook:          'How strong the opening seconds are at grabbing attention',
    emotion:       'How much emotion and energy the clip conveys',
    pacing:        'How well-timed the clip is — not too slow, not too fast',
    shareability:  'How likely viewers are to share or forward this clip',
  }
```

- [ ] **Step 3: Add breakdown UI below the timing row**

In `ClipCard`'s return JSX, find the timing row (the `<div>` that contains `⏱ {formatMs(...)}`) and add the breakdown section directly after it:

```tsx
        {/* Breakdown chips */}
        {clip.score_breakdown && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {(Object.keys(clip.score_breakdown) as (keyof ScoreBreakdown)[]).map((key) => {
                const comp = clip.score_breakdown![key]
                const color = comp.score >= 0.8 ? '#4ADE80' : comp.score >= 0.6 ? '#FCD34D' : '#C084FC'
                const bg    = comp.score >= 0.8 ? 'rgba(34,197,94,0.1)' : comp.score >= 0.6 ? 'rgba(234,179,8,0.1)' : 'rgba(168,85,247,0.1)'
                const isActive = activeBreakdown === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveBreakdown(isActive ? null : key)}
                    style={{
                      background: bg,
                      border: 'none',
                      borderRadius: 20,
                      color,
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                    }}
                  >
                    {BREAKDOWN_LABELS[key]} {Math.round(comp.score * 100)}% {isActive ? '▲' : '▼'}
                  </button>
                )
              })}
            </div>

            {activeBreakdown && clip.score_breakdown[activeBreakdown as keyof ScoreBreakdown] && (
              <div style={{
                padding: '8px 10px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(168,85,247,0.15)',
                borderRadius: 8,
              }}>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '0 0 4px', lineHeight: 1.4 }}>
                  {BREAKDOWN_DEFS[activeBreakdown]}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>
                  &ldquo;{clip.score_breakdown[activeBreakdown as keyof ScoreBreakdown].reason}&rdquo;
                </p>
              </div>
            )}
          </div>
        )}
```

- [ ] **Step 4: TypeScript check**

```
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Run all tests**

```
npx vitest run
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```
git add components/project/ClipsGrid.tsx
git commit -m "feat(module12): breakdown chips + expandable dropdown on ClipCard"
```

---

## Task 6: Push and verify

- [ ] **Step 1: Push to main**

```
git push origin main
```

- [ ] **Step 2: Re-analyze a project**

In the app, open a project with clips → click "Re-analyze" → wait for detection to complete → confirm each clip now shows 4 colored chips (Hook / Emotion / Pacing / Share) below the timing row.

- [ ] **Step 3: Test dropdown**

Click one chip → confirm dropdown opens with definition + reason. Click same chip → confirm it closes. Click a different chip → confirm previous closes and new one opens.

- [ ] **Step 4: Verify old clips**

Clips detected before this feature (no `score_breakdown`) should show no chip row — confirm they look identical to before.
