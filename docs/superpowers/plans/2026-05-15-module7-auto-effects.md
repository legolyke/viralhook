# Module 7 Auto Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add automatic silence removal, auto zoom, and fade transitions to every clip export on the Railway server — no UI changes, transparent to the user.

**Architecture:** Two-pass pipeline in `server/index.ts`: Pass 1 runs FFmpeg silencedetect analysis (~1-2s, no encode); Pass 2 runs a single FFmpeg encode using `filter_complex` that composes silence removal (trim+concat), crop+scale, zoom, fade, and subtitles in one pass. Pure filter-building functions extracted to `server/filters.ts` for testability.

**Tech Stack:** FFmpeg (silencedetect, zoompan, fade, trim, concat filters), fluent-ffmpeg, Node.js child_process.spawn, vitest

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `server/filters.ts` | **Create** | Pure functions: parseSilenceOutput, buildFilterComplex, buildZoomFilter, buildFadeFilters, remapSubtitleBlocks |
| `tests/server/filters.test.ts` | **Create** | Unit tests for all pure functions in filters.ts |
| `server/index.ts` | **Modify** | Add detectSilence(), import from filters.ts, refactor processClip() for 2-pass pipeline |

---

## Task 1: Create server/filters.ts with types and buildZoomFilter + buildFadeFilters

**Files:**
- Create: `server/filters.ts`
- Create: `tests/server/filters.test.ts`

- [ ] **Step 1: Write failing tests for buildZoomFilter and buildFadeFilters**

Create `tests/server/filters.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildZoomFilter, buildFadeFilters } from '../../server/filters'

describe('buildZoomFilter', () => {
  it('returns zoompan expression with correct dimensions', () => {
    const result = buildZoomFilter(1080, 1920)
    expect(result).toBe(
      "zoompan=z='1+0.05*sin(2*PI*t/6)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920"
    )
  })

  it('works for 720p dimensions', () => {
    const result = buildZoomFilter(720, 1280)
    expect(result).toContain('s=720x1280')
  })
})

describe('buildFadeFilters', () => {
  it('returns fade in/out at 0.5s for a 10s clip', () => {
    const result = buildFadeFilters(10)
    expect(result.video).toBe('fade=t=in:st=0:d=0.5,fade=t=out:st=9.500:d=0.5')
    expect(result.audio).toBe('afade=t=in:st=0:d=0.5,afade=t=out:st=9.500:d=0.5')
  })

  it('clamps fade out start to 0 for very short clips', () => {
    const result = buildFadeFilters(0.3)
    expect(result.video).toContain('st=0.000')
    expect(result.audio).toContain('st=0.000')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd D:\CLAUDE\proiecte\viralhook && npx vitest run tests/server/filters.test.ts 2>&1
```
Expected: FAIL — `server/filters` not found.

- [ ] **Step 3: Create server/filters.ts with types and first two functions**

```typescript
export interface SilenceSegment { start: number; end: number }  // seconds, 0-based

export interface SubtitleBlock { start: number; end: number; text: string }

export type Resolution = '720p' | '1080p'

export const RESOLUTION_DIMS: Record<Resolution, { w: number; h: number }> = {
  '720p':  { w: 720,  h: 1280 },
  '1080p': { w: 1080, h: 1920 },
}

export function buildZoomFilter(w: number, h: number): string {
  return `zoompan=z='1+0.05*sin(2*PI*t/6)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${w}x${h}`
}

export function buildFadeFilters(durationSec: number): { video: string; audio: string } {
  const d = 0.5
  const outStart = Math.max(0, durationSec - d).toFixed(3)
  return {
    video: `fade=t=in:st=0:d=${d},fade=t=out:st=${outStart}:d=${d}`,
    audio: `afade=t=in:st=0:d=${d},afade=t=out:st=${outStart}:d=${d}`,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd D:\CLAUDE\proiecte\viralhook && npx vitest run tests/server/filters.test.ts 2>&1
```
Expected: PASS (2 describe blocks, 4 tests).

- [ ] **Step 5: Commit**

```bash
cd D:\CLAUDE\proiecte\viralhook && git add server/filters.ts tests/server/filters.test.ts && git commit -m "feat: add buildZoomFilter and buildFadeFilters to server/filters.ts"
```

---

## Task 2: Add parseSilenceOutput to server/filters.ts

**Files:**
- Modify: `server/filters.ts`
- Modify: `tests/server/filters.test.ts`

- [ ] **Step 1: Write failing tests for parseSilenceOutput**

Append to `tests/server/filters.test.ts`:

```typescript
import { parseSilenceOutput } from '../../server/filters'

describe('parseSilenceOutput', () => {
  it('returns full clip as single segment when no silence detected', () => {
    const result = parseSilenceOutput('', 10)
    expect(result).toEqual([{ start: 0, end: 10 }])
  })

  it('splits clip around a single silence period', () => {
    const stderr = [
      '[silencedetect @ 0x1] silence_start: 3.5',
      '[silencedetect @ 0x1] silence_end: 6.2 | silence_duration: 2.7',
    ].join('\n')
    const result = parseSilenceOutput(stderr, 10)
    expect(result).toEqual([
      { start: 0, end: 3.5 },
      { start: 6.2, end: 10 },
    ])
  })

  it('handles two silence periods', () => {
    const stderr = [
      '[silencedetect @ 0x1] silence_start: 2',
      '[silencedetect @ 0x1] silence_end: 4 | silence_duration: 2',
      '[silencedetect @ 0x1] silence_start: 8',
      '[silencedetect @ 0x1] silence_end: 10.5 | silence_duration: 2.5',
    ].join('\n')
    const result = parseSilenceOutput(stderr, 15)
    expect(result).toEqual([
      { start: 0, end: 2 },
      { start: 4, end: 8 },
      { start: 10.5, end: 15 },
    ])
  })

  it('handles silence that starts at clip beginning', () => {
    const stderr = [
      '[silencedetect @ 0x1] silence_start: 0',
      '[silencedetect @ 0x1] silence_end: 2.5 | silence_duration: 2.5',
    ].join('\n')
    const result = parseSilenceOutput(stderr, 10)
    expect(result).toEqual([{ start: 2.5, end: 10 }])
  })

  it('handles unclosed silence at end of clip', () => {
    const stderr = '[silencedetect @ 0x1] silence_start: 7'
    const result = parseSilenceOutput(stderr, 10)
    expect(result).toEqual([{ start: 0, end: 7 }])
  })

  it('returns full clip when total kept duration would be less than 5s', () => {
    // Only 1s of non-silence in a 10s clip — safety fallback
    const stderr = [
      '[silencedetect @ 0x1] silence_start: 1',
      '[silencedetect @ 0x1] silence_end: 10 | silence_duration: 9',
    ].join('\n')
    const result = parseSilenceOutput(stderr, 10)
    expect(result).toEqual([{ start: 0, end: 10 }])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd D:\CLAUDE\proiecte\viralhook && npx vitest run tests/server/filters.test.ts 2>&1
```
Expected: FAIL — `parseSilenceOutput` not exported.

- [ ] **Step 3: Implement parseSilenceOutput in server/filters.ts**

Append to `server/filters.ts`:

```typescript
export function parseSilenceOutput(
  stderr: string,
  clipDurationSec: number,
): SilenceSegment[] {
  const silenceStarts: number[] = []
  const silenceEnds: number[] = []

  for (const line of stderr.split('\n')) {
    const startMatch = line.match(/silence_start:\s*([\d.]+)/)
    const endMatch   = line.match(/silence_end:\s*([\d.]+)/)
    if (startMatch) silenceStarts.push(parseFloat(startMatch[1]))
    if (endMatch)   silenceEnds.push(parseFloat(endMatch[1]))
  }

  // Unclosed silence at end of clip
  if (silenceStarts.length > silenceEnds.length) {
    silenceEnds.push(clipDurationSec)
  }

  // Build non-silent segments
  const kept: SilenceSegment[] = []
  let cursor = 0

  for (let i = 0; i < silenceStarts.length; i++) {
    const silStart = silenceStarts[i]
    const silEnd   = silenceEnds[i]
    if (silStart > cursor + 0.05) {
      kept.push({ start: cursor, end: silStart })
    }
    cursor = silEnd
  }
  if (cursor < clipDurationSec - 0.05) {
    kept.push({ start: cursor, end: clipDurationSec })
  }

  if (kept.length === 0) return [{ start: 0, end: clipDurationSec }]

  // Safety: if total kept < 5s, skip silence removal
  const totalKept = kept.reduce((sum, s) => sum + s.end - s.start, 0)
  if (totalKept < 5) return [{ start: 0, end: clipDurationSec }]

  return kept
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd D:\CLAUDE\proiecte\viralhook && npx vitest run tests/server/filters.test.ts 2>&1
```
Expected: PASS (all silence tests passing).

- [ ] **Step 5: Commit**

```bash
cd D:\CLAUDE\proiecte\viralhook && git add server/filters.ts tests/server/filters.test.ts && git commit -m "feat: add parseSilenceOutput with safety fallback"
```

---

## Task 3: Add remapSubtitleBlocks to server/filters.ts

**Files:**
- Modify: `server/filters.ts`
- Modify: `tests/server/filters.test.ts`

- [ ] **Step 1: Write failing tests for remapSubtitleBlocks**

Append to `tests/server/filters.test.ts`:

```typescript
import { remapSubtitleBlocks, type SilenceSegment } from '../../server/filters'

describe('remapSubtitleBlocks', () => {
  const segments: SilenceSegment[] = [
    { start: 0, end: 3.5 },    // kept 0-3.5s (cumulative: 0)
    { start: 6.2, end: 10 },   // kept 6.2-10s (cumulative: 3.5s)
  ]

  it('remaps block in first segment (no offset)', () => {
    const blocks = [{ start: 1000, end: 2000, text: 'hello' }]
    const result = remapSubtitleBlocks(blocks, segments)
    expect(result).toEqual([{ start: 1000, end: 2000, text: 'hello' }])
  })

  it('remaps block in second segment (offset by removed silence)', () => {
    // original 7s-8s → segment 2 starts at 6.2s, cumulative before = 3.5s
    // offsetSec = 3.5 - 6.2 = -2.7s → 7000 - 2700 = 4300ms, 8000 - 2700 = 5300ms
    const blocks = [{ start: 7000, end: 8000, text: 'world' }]
    const result = remapSubtitleBlocks(blocks, segments)
    expect(result).toEqual([{ start: 4300, end: 5300, text: 'world' }])
  })

  it('drops block that falls inside silence gap', () => {
    // 4000ms-5500ms falls in silence gap 3.5-6.2s
    const blocks = [{ start: 4000, end: 5500, text: 'silent' }]
    const result = remapSubtitleBlocks(blocks, segments)
    expect(result).toEqual([])
  })

  it('handles empty blocks array', () => {
    expect(remapSubtitleBlocks([], segments)).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd D:\CLAUDE\proiecte\viralhook && npx vitest run tests/server/filters.test.ts 2>&1
```
Expected: FAIL — `remapSubtitleBlocks` not exported.

- [ ] **Step 3: Implement remapSubtitleBlocks in server/filters.ts**

Append to `server/filters.ts`:

```typescript
export function remapSubtitleBlocks(
  blocks: SubtitleBlock[],
  segments: SilenceSegment[],
): SubtitleBlock[] {
  // Cumulative start time in new timeline for each segment
  const cumulative: number[] = []
  let cum = 0
  for (const seg of segments) {
    cumulative.push(cum)
    cum += seg.end - seg.start
  }

  const result: SubtitleBlock[] = []
  for (const block of blocks) {
    const centerSec = (block.start + block.end) / 2 / 1000
    const segIdx = segments.findIndex(s => centerSec >= s.start && centerSec < s.end)
    if (segIdx === -1) continue  // falls in silence — drop

    const seg = segments[segIdx]
    const offsetSec = cumulative[segIdx] - seg.start
    result.push({
      start: Math.round(block.start / 1000 * 1000 + offsetSec * 1000),
      end:   Math.round(block.end   / 1000 * 1000 + offsetSec * 1000),
      text:  block.text,
    })
  }
  return result
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd D:\CLAUDE\proiecte\viralhook && npx vitest run tests/server/filters.test.ts 2>&1
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd D:\CLAUDE\proiecte\viralhook && git add server/filters.ts tests/server/filters.test.ts && git commit -m "feat: add remapSubtitleBlocks for subtitle sync after silence removal"
```

---

## Task 4: Add buildFilterComplex to server/filters.ts

**Files:**
- Modify: `server/filters.ts`
- Modify: `tests/server/filters.test.ts`

- [ ] **Step 1: Write failing tests for buildFilterComplex**

Append to `tests/server/filters.test.ts`:

```typescript
import { buildFilterComplex } from '../../server/filters'

describe('buildFilterComplex', () => {
  it('no silence: produces single-stream filter with crop+zoom+fade', () => {
    const { filterComplex, mapVideo, mapAudio } = buildFilterComplex({
      segments: null,
      cropX: 0.5,
      resolution: '1080p',
      durationSec: 10,
      subtitleData: null,
      textFiles: [],
    })
    expect(mapVideo).toBe('[vout]')
    expect(mapAudio).toBe('[aout]')
    expect(filterComplex).toContain('crop=ih*9/16:ih:(iw-ih*9/16)*0.5:0,scale=1080:1920')
    expect(filterComplex).toContain('zoompan=')
    expect(filterComplex).toContain('fade=t=in:st=0')
    expect(filterComplex).toContain('[vout]')
    expect(filterComplex).toContain('[aout]')
  })

  it('with silence: produces trim+concat+crop+zoom+fade', () => {
    const segments: SilenceSegment[] = [
      { start: 0, end: 3.5 },
      { start: 6.2, end: 10 },
    ]
    const { filterComplex, mapVideo, mapAudio } = buildFilterComplex({
      segments,
      cropX: 0,
      resolution: '720p',
      durationSec: 7.3,
      subtitleData: null,
      textFiles: [],
    })
    expect(mapVideo).toBe('[vout]')
    expect(mapAudio).toBe('[aout]')
    expect(filterComplex).toContain('trim=start=0.000:end=3.500')
    expect(filterComplex).toContain('trim=start=6.200:end=10.000')
    expect(filterComplex).toContain('concat=n=2:v=1:a=1')
    expect(filterComplex).toContain('crop=ih*9/16:ih:(iw-ih*9/16)*0:0,scale=720:1280')
  })

  it('with subtitles: includes drawtext in filter', () => {
    const { filterComplex } = buildFilterComplex({
      segments: null,
      cropX: 0.5,
      resolution: '1080p',
      durationSec: 10,
      subtitleData: {
        blocks: [{ start: 1000, end: 3000, text: 'hello' }],
        font_size: 40,
        color: '#FFFFFF',
        position: 'bottom',
      },
      textFiles: ['/tmp/sub0.txt'],
    })
    expect(filterComplex).toContain('drawtext=')
    expect(filterComplex).toContain("enable='between(t,1.000,3.000)'")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd D:\CLAUDE\proiecte\viralhook && npx vitest run tests/server/filters.test.ts 2>&1
```
Expected: FAIL — `buildFilterComplex` not exported.

- [ ] **Step 3: Add SubtitleData interface and implement buildFilterComplex in server/filters.ts**

Append to `server/filters.ts`:

```typescript
export interface SubtitleData {
  blocks: SubtitleBlock[]
  font_size: number
  color: string
  position: string
}

export interface FilterComplexResult {
  filterComplex: string
  mapVideo: string
  mapAudio: string
}

export function buildFilterComplex(params: {
  segments: SilenceSegment[] | null
  cropX: number
  resolution: Resolution
  durationSec: number
  subtitleData: SubtitleData | null
  textFiles: string[]
}): FilterComplexResult {
  const { segments, cropX, resolution, durationSec, subtitleData, textFiles } = params
  const { w, h } = RESOLUTION_DIMS[resolution]
  const parts: string[] = []

  if (segments && segments.length > 1) {
    // Silence removal: trim each segment, then concat
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i]
      parts.push(
        `[0:v]trim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},setpts=PTS-STARTPTS[v${i}]`
      )
      parts.push(
        `[0:a]atrim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`
      )
    }
    const vInputs = segments.map((_, i) => `[v${i}][a${i}]`).join('')
    parts.push(`${vInputs}concat=n=${segments.length}:v=1:a=1[vcombined][acombined]`)

    const zoom = buildZoomFilter(w, h)
    const fade = buildFadeFilters(durationSec)
    const subtitleStr = buildSubtitleFilters(subtitleData, textFiles)
    const videoChain = [
      `crop=ih*9/16:ih:(iw-ih*9/16)*${cropX}:0,scale=${w}:${h}`,
      zoom,
      fade.video,
      subtitleStr,
    ].filter(Boolean).join(',')

    parts.push(`[vcombined]${videoChain}[vout]`)
    parts.push(`[acombined]${fade.audio}[aout]`)
  } else {
    // No silence removal: single stream
    const startSec = segments ? segments[0].start : 0
    const endSec   = segments ? segments[0].end   : durationSec
    const effectiveDuration = endSec - startSec

    const zoom = buildZoomFilter(w, h)
    const fade = buildFadeFilters(effectiveDuration)
    const subtitleStr = buildSubtitleFilters(subtitleData, textFiles)
    const videoChain = [
      `crop=ih*9/16:ih:(iw-ih*9/16)*${cropX}:0,scale=${w}:${h}`,
      zoom,
      fade.video,
      subtitleStr,
    ].filter(Boolean).join(',')

    parts.push(`[0:v]${videoChain}[vout]`)
    parts.push(`[0:a]${fade.audio}[aout]`)
  }

  return {
    filterComplex: parts.join(';'),
    mapVideo: '[vout]',
    mapAudio: '[aout]',
  }
}

function buildSubtitleFilters(
  subtitleData: SubtitleData | null,
  textFiles: string[],
): string {
  if (!subtitleData || textFiles.length === 0) return ''
  const colorHex = subtitleData.color.replace('#', '')
  const y = subtitleData.position === 'top'
    ? `${subtitleData.font_size}`
    : `h-th-${Math.round(subtitleData.font_size * 2)}`

  return subtitleData.blocks
    .map((block, i) => {
      if (!textFiles[i]) return null
      const startS = (block.start / 1000).toFixed(3)
      const endS   = (block.end   / 1000).toFixed(3)
      const tf = textFiles[i].replace(/\\/g, '/')
      return (
        `drawtext=textfile='${tf}'` +
        `:fontfile='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'` +
        `:x=(w-text_w)/2:y=${y}` +
        `:fontsize=${subtitleData.font_size}` +
        `:fontcolor=0x${colorHex}` +
        `:borderw=3:bordercolor=black` +
        `:enable='between(t,${startS},${endS})'`
      )
    })
    .filter(Boolean)
    .join(',')
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd D:\CLAUDE\proiecte\viralhook && npx vitest run tests/server/filters.test.ts 2>&1
```
Expected: PASS (all tests in all describe blocks).

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
cd D:\CLAUDE\proiecte\viralhook && npx vitest run 2>&1
```
Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
cd D:\CLAUDE\proiecte\viralhook && git add server/filters.ts tests/server/filters.test.ts && git commit -m "feat: add buildFilterComplex — composes silence removal, zoom, fade, subtitles"
```

---

## Task 5: Add detectSilence() to server/index.ts and wire up 2-pass pipeline

**Files:**
- Modify: `server/index.ts`

- [ ] **Step 1: Add imports at top of server/index.ts**

Replace the existing import block:
```typescript
import express from 'express'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
```

With:
```typescript
import express from 'express'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { execSync, spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  parseSilenceOutput,
  buildFilterComplex,
  remapSubtitleBlocks,
  type SilenceSegment,
  type SubtitleData,
  type Resolution,
  RESOLUTION_DIMS,
} from './filters'
```

- [ ] **Step 2: Remove duplicate type/const declarations from server/index.ts**

Remove these lines (now imported from filters.ts):
```typescript
interface SubtitleData {
  blocks: { start: number; end: number; text: string }[]
  font_size: number
  color: string
  position: string
}

type Resolution = '720p' | '1080p'

const RESOLUTION_DIMS: Record<Resolution, { w: number; h: number }> = {
  '720p':  { w: 720,  h: 1280  },
  '1080p': { w: 1080, h: 1920  },
}
```

- [ ] **Step 3: Add detectSilence() function after the patchClip function**

Insert after `patchClip`:
```typescript
async function detectSilence(
  inputPath: string,
  clipStartSec: number,
  clipEndSec: number,
): Promise<SilenceSegment[]> {
  const clipDuration = clipEndSec - clipStartSec
  return new Promise((resolve) => {
    let stderr = ''
    const ffmpegBin = resolvedFfmpegPath ?? 'ffmpeg'
    const args = [
      '-ss', clipStartSec.toFixed(3),
      '-to', clipEndSec.toFixed(3),
      '-i', inputPath,
      '-af', 'silencedetect=noise=-30dB:duration=1.5',
      '-f', 'null', '-',
    ]

    const proc = spawn(ffmpegBin, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    proc.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
    proc.on('close', () => {
      const segments = parseSilenceOutput(stderr, clipDuration)
      console.log(`[silence] ${segments.length} kept segments, stderr lines: ${stderr.split('\n').filter(l => l.includes('silence')).length}`)
      resolve(segments)
    })
    proc.on('error', (err) => {
      console.warn('[silence] detection failed, skipping:', err.message)
      resolve([{ start: 0, end: clipDuration }])
    })
  })
}
```

- [ ] **Step 4: Remove buildVideoFilter, wrapText from server/index.ts (moved to filters.ts)**

Delete the `wrapText` function (lines ~97-115) and `buildVideoFilter` function (lines ~117-154). These are now handled inside `buildFilterComplex` in `filters.ts`.

Note: `wrapText` is still needed in `server/index.ts` for writing text files before calling `buildFilterComplex`. Keep `wrapText` but move it just before `processClip`.

- [ ] **Step 5: Rewrite processClip() with 2-pass pipeline**

Replace the entire `processClip` function with:

```typescript
async function processClip(
  clipId: string,
  sourceKey: string,
  startMs: number,
  endMs: number,
  cropX: number,
  subtitleData: SubtitleData | null,
  resolution: Resolution = '1080p',
): Promise<void> {
  const inputPath  = path.join(os.tmpdir(), `vh_in_${clipId}.mp4`)
  const outputPath = path.join(os.tmpdir(), `vh_out_${clipId}.mp4`)
  const textFiles: string[] = []

  try {
    const startSec = startMs / 1000
    const endSec   = endMs   / 1000
    const clipDurationSec = endSec - startSec

    console.log(`[process] clip ${clipId} | ${startMs}-${endMs}ms cropX=${cropX} res=${resolution} subs=${subtitleData ? subtitleData.blocks.length + ' blocks' : 'none'}`)

    await downloadFromR2(sourceKey, inputPath)

    // Pass 1: detect silence (fast, no encode)
    const rawSegments = await detectSilence(inputPath, startSec, endSec)
    const silenceRemoved = !(rawSegments.length === 1 &&
      rawSegments[0].start < 0.05 &&
      rawSegments[0].end > clipDurationSec - 0.05)
    const segments = silenceRemoved ? rawSegments : null

    const newDurationSec = segments
      ? segments.reduce((sum, s) => sum + s.end - s.start, 0)
      : clipDurationSec

    // Remap subtitle timestamps if silence was removed
    let effectiveSubs = subtitleData
    if (segments && subtitleData) {
      effectiveSubs = {
        ...subtitleData,
        blocks: remapSubtitleBlocks(subtitleData.blocks, segments),
      }
    }

    // Write subtitle text files
    if (effectiveSubs) {
      const { w: vw } = RESOLUTION_DIMS[resolution]
      for (let i = 0; i < effectiveSubs.blocks.length; i++) {
        const tf = path.join(os.tmpdir(), `vh_txt_${clipId}_${i}.txt`)
        const wrapped = wrapText(effectiveSubs.blocks[i].text, vw, effectiveSubs.font_size)
        fs.writeFileSync(tf, wrapped, 'utf8')
        textFiles.push(tf)
      }
    }

    // Pass 2: build filter_complex and encode
    const { filterComplex, mapVideo, mapAudio } = buildFilterComplex({
      segments,
      cropX,
      resolution,
      durationSec: newDurationSec,
      subtitleData: effectiveSubs,
      textFiles,
    })

    console.log(`[process] filter_complex (first 200): ${filterComplex.slice(0, 200)}`)
    console.log(`[process] silence_removed=${silenceRemoved} new_duration=${newDurationSec.toFixed(1)}s`)

    await new Promise<void>((resolve, reject) => {
      const ff = ffmpeg(inputPath)
        .inputOptions([
          `-ss ${startSec.toFixed(3)}`,
          `-to ${endSec.toFixed(3)}`,
        ])

      ff.complexFilter(filterComplex)
        .outputOptions(['-map', mapVideo, '-map', mapAudio])
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOption('-movflags', 'faststart')
        .save(outputPath)
        .on('start', (cmd) => console.log(`[ffmpeg] cmd: ${cmd.slice(0, 200)}`))
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(new Error(`FFmpeg error: ${err.message}`)))
    })

    console.log(`[process] ffmpeg done for ${clipId}`)

    const outputKey = `clips/${clipId}.mp4`
    await uploadToR2(outputPath, outputKey)

    const fileUrl = `${process.env.R2_PUBLIC_URL}/${outputKey}`
    await patchClip(clipId, { file_url: fileUrl, status: 'ready' })
    console.log(`[process] clip ${clipId} → ready ✓`)
  } catch (err) {
    console.error(`[process] FAILED clip ${clipId}:`, err)
    try { await patchClip(clipId, { status: 'error' }) } catch {}
  } finally {
    for (const p of [inputPath, outputPath, ...textFiles]) {
      try { if (fs.existsSync(p)) fs.unlinkSync(p) } catch {}
    }
  }
}
```

- [ ] **Step 6: Run TypeScript check**

```bash
cd D:\CLAUDE\proiecte\viralhook && npx tsc --noEmit 2>&1
```
Expected: no errors.

- [ ] **Step 7: Run full test suite**

```bash
cd D:\CLAUDE\proiecte\viralhook && npx vitest run 2>&1
```
Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
cd D:\CLAUDE\proiecte\viralhook && git add server/index.ts && git commit -m "feat: 2-pass pipeline in processClip — silence removal, zoom, fade auto-applied"
```

---

## Task 6: Deploy to Railway and smoke test

**Files:**
- No code changes — deploy and verify

- [ ] **Step 1: Push to GitHub (triggers Railway auto-deploy)**

```bash
cd D:\CLAUDE\proiecte\viralhook && git push origin main
```

- [ ] **Step 2: Watch Railway logs for startup confirmation**

Open Railway dashboard → viralhook-production → Logs. Confirm:
```
[startup] listening on port ...
[startup] ffmpeg path: /usr/bin/ffmpeg
```

- [ ] **Step 3: Test export on viralhook-chi.vercel.app**

1. Open a project with status `ready` and at least one clip
2. Click **Export** on a clip
3. Select **1080p**, leave subtitles off, click **Generate Clip**
4. Watch Railway logs — confirm you see:
   - `[silence] N kept segments`
   - `[process] silence_removed=true/false`
   - `[ffmpeg] cmd: ...filter_complex...zoompan...fade...`
   - `[process] clip {id} → ready ✓`
5. Download the clip — verify fade in/out visible, zoom subtle but present

- [ ] **Step 4: Test with subtitles enabled**

1. Same flow, this time enable **Burn into video** subtitles
2. Download and verify subtitles are in sync with speech (not shifted by silence gaps)

- [ ] **Step 5: Commit smoke test notes (optional)**

```bash
cd D:\CLAUDE\proiecte\viralhook && git commit --allow-empty -m "chore: module 7 auto effects deployed and smoke tested"
```
