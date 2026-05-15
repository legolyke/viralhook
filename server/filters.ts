export interface SilenceSegment { start: number; end: number }  // seconds, 0-based

export interface SubtitleBlock { start: number; end: number; text: string }

export type Resolution = '720p' | '1080p'

export const RESOLUTION_DIMS: Record<Resolution, { w: number; h: number }> = {
  '720p':  { w: 720,  h: 1280 },
  '1080p': { w: 1080, h: 1920 },
}

export const FADE_DURATION_SEC = 0.5

export function buildZoomFilter(w: number, h: number): string {
  return `zoompan=z='1+0.05*sin(2*PI*t/6)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${w}x${h}`
}

export function buildFadeFilters(durationSec: number): { video: string; audio: string } {
  const d = FADE_DURATION_SEC
  const outStart = Math.max(0, durationSec - d).toFixed(3)
  return {
    video: `fade=t=in:st=0:d=${d},fade=t=out:st=${outStart}:d=${d}`,
    audio: `afade=t=in:st=0:d=${d},afade=t=out:st=${outStart}:d=${d}`,
  }
}

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
      start: Math.round(block.start + offsetSec * 1000),
      end:   Math.round(block.end   + offsetSec * 1000),
      text:  block.text,
    })
  }
  return result
}
