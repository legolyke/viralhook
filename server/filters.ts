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
