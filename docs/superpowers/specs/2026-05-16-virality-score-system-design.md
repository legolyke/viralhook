# Virality Score System (Module 12) — Design Spec

## Goal

Extend the existing virality score (single number) with a 4-component breakdown (Hook, Emotion, Pacing, Shareability), each with a score and a plain-English reason. The breakdown is generated in the same GPT call as the score and displayed directly on each clip card.

## Architecture

Single change point: extend `detectViralClips()` to return a `breakdown` object alongside the existing `score`. Everything else flows from there.

```
GPT-4o-mini (extended prompt)
  → DetectedClip { score, breakdown: { hook, emotion, pacing, shareability } }
  → clips table: score_breakdown JSONB column
  → ClipsGrid: score badge + 4 component chips with expandable dropdown
```

## Data Model

New column on `clips` table:

```sql
ALTER TABLE clips ADD COLUMN score_breakdown JSONB;
```

Shape of `score_breakdown`:
```json
{
  "hook":         { "score": 0.90, "reason": "The opening question immediately stops the scroll" },
  "emotion":      { "score": 0.85, "reason": "High energy delivery creates excitement" },
  "pacing":       { "score": 0.78, "reason": "Tight cuts keep attention throughout" },
  "shareability": { "score": 0.82, "reason": "Relatable situation most viewers will forward" }
}
```

Scores are 0.0–1.0 floats. Reasons are 1–2 sentence strings in English. Null if clip was detected before this feature (no breakdown available).

## GPT Prompt Extension (`lib/openai.ts`)

Extend `DetectedClip` interface:

```typescript
interface ScoreComponent {
  score: number   // 0.0–1.0
  reason: string  // 1-2 sentences, English
}

interface DetectedClip {
  title:     string
  start_ms:  number
  end_ms:    number
  score:     number
  breakdown: {
    hook:          ScoreComponent
    emotion:       ScoreComponent
    pacing:        ScoreComponent
    shareability:  ScoreComponent
  }
}
```

System prompt addition (appended to existing prompt):

```
For each clip, also return a "breakdown" object with four components:
- hook: how strong the opening seconds are at grabbing attention (score + 1-2 sentence reason)
- emotion: how much emotion/energy the clip conveys (score + 1-2 sentence reason)  
- pacing: how well-timed the clip is — not too slow, not too fast (score + 1-2 sentence reason)
- shareability: how likely viewers are to share or forward this clip (score + 1-2 sentence reason)

Each component has a "score" (0.0–1.0) and a "reason" (plain English, 1-2 sentences).
The overall score should reflect the weighted average of these four components.
```

Validation: if `breakdown` is missing or malformed in the GPT response, set `breakdown: null` and keep the clip (score is still valid).

## Backend (`app/api/projects/[id]/detect-clips/route.ts`)

Add `score_breakdown` to the insert object:

```typescript
{
  ...existingFields,
  score_breakdown: clip.breakdown ?? null,
}
```

No schema change to the Supabase query in `projects/[id]/page.tsx` — add `score_breakdown` to the select.

## UI (`components/project/ClipsGrid.tsx`)

### Clip interface addition
```typescript
score_breakdown: {
  hook:          { score: number; reason: string }
  emotion:       { score: number; reason: string }
  pacing:        { score: number; reason: string }
  shareability:  { score: number; reason: string }
} | null
```

### Component definitions shown in dropdown (hardcoded, English)
```typescript
const BREAKDOWN_DEFINITIONS = {
  hook:          'How strong the opening seconds are at grabbing attention',
  emotion:       'How much emotion and energy the clip conveys',
  pacing:        'How well-timed the clip is — not too slow, not too fast',
  shareability:  'How likely viewers are to share or forward this clip',
}
```

### Layout on card
Below the existing score badge row, if `score_breakdown` is not null:

```
[Hook 90% ▾]  [Emotion 85% ▾]  [Pacing 78% ▾]  [Share 82% ▾]
```

- Each chip: label + score percentage + chevron icon
- Chip color matches score: ≥80% green, ≥60% yellow, <60% purple (same thresholds as main score)
- Font size 11px, chips are inline, wrap on small screens

When a chip is clicked, a dropdown appears directly below the chip row:

```
Hook — How strong the opening seconds are at grabbing attention
"The opening question immediately stops the scroll and creates curiosity"
```

- Only one dropdown open at a time (clicking another chip closes the previous)
- Dropdown closes when clicking the same chip again
- State managed with `useState<string | null>` (active component key or null)

### Old clips without breakdown
If `score_breakdown` is null, the chip row is not rendered. No placeholder or message shown.

## Access Control

No plan-gating for breakdown display. If a clip has a score, it has a breakdown — gating is on the detect-clips feature itself (already implemented in Module 6).

## Error Handling

- GPT returns breakdown with missing fields → validate each component; set component to null if invalid, still save what's valid
- GPT returns no breakdown at all → `score_breakdown = null`, clip still saved normally
- Existing clips with `score_breakdown = null` → chip row hidden in UI

## What Is Not in Scope

- Keyword highlighting per component
- Historical score tracking (score changes over time)
- Comparison across clips (relative ranking)
- Animated score reveal
