# Module 7 Completion — Auto Effects Design
**Date:** 2026-05-15
**Scope:** Silence Removal + Auto Zoom + Scene Transitions (automatic, no UI changes)

## Overview

Complete Module 7 by adding three automatic video enhancement features to the Railway processing pipeline. All features apply transparently on every export — no user toggles, no UI changes. Approach mirrors Opus Clip: AI does everything automatically.

## Features

### 1. Silence Removal
Detects and removes audio gaps ≥ 1.5 seconds (threshold: -30dB). Makes clips more dynamic by eliminating dead air, hesitations, and long pauses.

- **Tool:** FFmpeg `silencedetect` filter (analysis pass, no encoding)
- **Threshold:** `-30dB`, minimum duration `1.5s`
- **Safety:** If remaining duration would be < 5 seconds, skip silence removal entirely
- **Skip condition:** Video has no audio stream

### 2. Auto Zoom
Applies a subtle sinusoidal zoom oscillation (1.0x → 1.05x → 1.0x) with a 6-second cycle. Adds perceived dynamism without being aggressive or distracting.

- **Tool:** FFmpeg `zoompan` filter
- **Expression:** `z='1+0.05*sin(2*PI*t/6)'`, centered on frame midpoint
- **Skip condition:** Clip duration < 3 seconds after silence removal

### 3. Scene Transitions (Fade)
Adds 0.5-second fade-in at start and 0.5-second fade-out at end, applied to both video and audio streams.

- **Tool:** FFmpeg `fade` + `afade` filters
- **Duration:** 0.5 seconds each end
- **Always applied** (no skip condition — every clip benefits from smooth edges)

## Processing Pipeline

```
Download from R2
       ↓
Pass 1: detectSilence() — FFmpeg analysis only (~1-2s, no encode)
       ↓
Build filter_complex:
  silence removal (trim + concat segments)
  → zoom (zoompan)
  → fade in/out (fade + afade)
  → crop 9:16 (existing)
  → subtitles (existing, if enabled)
       ↓
Pass 2: Single FFmpeg encode with full filter_complex
       ↓
Upload to R2 → Update Supabase status
```

## Code Changes

**Only file modified: `server/index.ts`**

New functions:
- `detectSilence(inputPath, startSec, endSec): Promise<{start: number, end: number}[]>` — runs FFmpeg silencedetect, parses stderr, returns non-silent segments
- `buildSilenceFilter(segments, totalDuration): string` — builds filter_complex trim+concat for silence removal; returns empty string if no silence detected
- `buildZoomFilter(width, height): string` — returns zoompan filter expression
- `buildFadeFilter(durationSec): {video: string, audio: string}` — returns fade filter strings for both streams

Modified:
- `buildVideoFilter()` — extended to accept silence segments and compose all filters in correct order
- `processClip()` (main export function) — orchestrates 2-pass pipeline

**No changes to:**
- Any Next.js route or component
- Supabase schema or migrations
- Railway environment variables
- ExportModal UI

## Edge Cases

| Condition | Behavior |
|-----------|----------|
| No audio stream | Skip silence removal |
| No silence detected | Skip silence removal, apply zoom + fade only |
| Post-removal duration < 5s | Revert to original clip, apply zoom + fade only |
| Clip duration < 3s | Skip zoom, apply fade only |
| Subtitle timing after silence removal | Subtitle blocks recalculated from words within non-silent segments |

## Subtitle Synchronization

Silence removal changes clip duration, which invalidates pre-calculated subtitle timestamps. The subtitle data (word timestamps from AssemblyAI) is sent in the request body. Remapping algorithm:

1. Compute kept segments: e.g. `[{start:0, end:10s}, {start:15s, end:25s}]` (5s silence removed at 10-15s)
2. Track cumulative offset per segment (segment 2 words shift back by 5s)
3. For each subtitle word: find its segment → apply cumulative offset → new timestamp
4. Words that fall inside a removed silence period are discarded
5. Pass remapped words to `buildVideoFilter()` for drawtext rendering

## Testing Checklist

- [ ] Export clip from 16:9 landscape video → silence removed, zoom applied, fade visible
- [ ] Export clip from 9:16 portrait video → same effects applied
- [ ] Export with subtitles enabled → subtitles in sync after silence removal
- [ ] Clip with no pauses → silence removal skipped, zoom + fade still applied
- [ ] Very short clip (< 3s) → zoom skipped, fade applied
- [ ] Muted/no-audio video → silence removal skipped gracefully
