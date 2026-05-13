# AI Viral Clip Detection — Design Spec

## Goal

Automatically detect 3-5 viral clip moments from a video transcript using GPT-4o-mini, saving them to the `clips` table immediately after transcription completes.

## Architecture

### Flow

```
transcript saved (webhook or retry-transcription)
  → detectViralClips(projectId, userId, words, highlights)
  → GPT-4o-mini analyzes transcript (~2-3s)
  → clips saved to `clips` table
  → project status = 'ready'
```

Detection is **synchronous** — clips exist before status becomes `ready`, so users see them immediately without extra polling.

### Files

**New:**
- `lib/openai.ts` — OpenAI client + `detectViralClips()` function
- `app/api/projects/[id]/detect-clips/route.ts` — POST endpoint for manual re-analysis

**Modified:**
- `app/api/transcribe/webhook/route.ts` — call detectViralClips after transcript saved
- `app/api/projects/[id]/retry-transcription/route.ts` — call detectViralClips after transcript saved
- `components/project/ClipsGrid.tsx` — replace placeholder with real clip cards

**Environment variables:**
- `OPENAI_API_KEY` — required in `.env.local` and Vercel

## GPT-4o-mini Integration

### Input

Sent to GPT:
1. Full transcript text with word-level timestamps (ms)
2. Auto-highlights from AssemblyAI (viral phrases with rank scores)

Token estimate: ~1000-1500 tokens per 1-minute video. Cost: ~$0.0002/video.

### Output format

```json
[
  {
    "title": "Short catchy title for the clip",
    "hook": "The opening line that hooks viewers",
    "start_ms": 1200,
    "end_ms": 34500,
    "score": 0.87
  }
]
```

### Rules enforced in prompt

- 3-5 clips per video
- Each clip: 15–60 seconds (15000–60000ms)
- `start_ms` and `end_ms` must correspond to real word timestamps from the input
- Score 0.0–1.0 based on: emotional impact, humor, surprise, shareable quotes
- No overlapping clips
- Priority: emotional moments, quotable phrases, humor, surprising revelations

### Error handling

If GPT fails or returns invalid JSON:
- Project remains at `ready` status (non-fatal)
- No clips saved
- ClipsGrid shows "Analysis failed" with "Re-analyze" button

## Database

Uses existing `clips` table from Module 4:
```sql
clips (
  id uuid,
  project_id uuid,
  user_id uuid,
  start_ms integer,
  end_ms integer,
  title text,
  score numeric,
  clip_url text,       -- null until Module 7 (video clipping)
  status text,         -- 'detected' (no video yet)
  created_at timestamptz
)
```

No schema changes needed.

## UI — ClipsGrid Component

### States

| Condition | Display |
|-----------|---------|
| status not `ready` | "AI analysis will start once the video is processed." |
| status `ready`, clips exist | Grid of clip cards |
| status `ready`, 0 clips | "Analysis failed" + "Re-analyze" button |

### Clip Card

Each card shows:
- Title
- Time range: `0:01 – 0:34 (33s)`
- Virality score as percentage: `87%`
- Hook text
- "Export" button — disabled, "Coming soon" (activates in Module 9)

Layout: 2-column grid on desktop, 1-column on mobile. Cards sorted by score descending.

### Re-analyze

`POST /api/projects/[id]/detect-clips` — authenticated, re-runs GPT detection. Deletes existing clips for the project before inserting new ones.

## Security

- All clip detection endpoints require authenticated user
- `user_id` on clips matches authenticated user — no cross-user data access
- OpenAI API key is server-side only, never exposed to client
- Service role not needed — user's RLS session is sufficient

## Known Limitations

- Clip timestamps depend on GPT accurately reading word timestamps — occasional off-by-a-few-seconds expected
- No video file is generated yet (Module 7)
- Detection quality lower for non-English transcripts (GPT understands Romanian but viral patterns are English-optimized)
