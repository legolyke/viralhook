export interface SilenceSegment { start: number; end: number }  // seconds, 0-based

export interface SubtitleBlock { start: number; end: number; text: string }

export type Resolution = '720p' | '1080p'

export const RESOLUTION_DIMS: Record<Resolution, { w: number; h: number }> = {
  '720p':  { w: 720,  h: 1280 },
  '1080p': { w: 1080, h: 1920 },
}

export const FADE_DURATION_SEC = 0.5

export function buildZoomFilter(w: number, h: number): string {
  return `zoompan=z='1.025+0.025*sin(2*PI*t/6)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${w}x${h}`
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

const DEJAVU_BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
const LIBERATION_SANS = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'
const LIBERATION_SERIF = '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'

const FONT_PATH_MAP: Record<string, string> = {
  'arial':           LIBERATION_SANS,
  'ubuntu':          LIBERATION_SANS,
  'oswald':          '/usr/share/fonts/truetype/google/Oswald-Bold.ttf',
  'anton':           '/usr/share/fonts/truetype/google/Anton-Regular.ttf',
  'bebas-neue':      '/usr/share/fonts/truetype/google/BebasNeue-Regular.ttf',
  'bangers':         '/usr/share/fonts/truetype/google/Bangers-Regular.ttf',
  'montserrat':      '/usr/share/fonts/truetype/google/Montserrat-Bold.ttf',
  'poppins':         '/usr/share/fonts/truetype/google/Poppins-Bold.ttf',
  'pacifico':        '/usr/share/fonts/truetype/google/Pacifico-Regular.ttf',
  'dancing-script':  '/usr/share/fonts/truetype/google/DancingScript-Bold.ttf',
  'playfair':        LIBERATION_SERIF,
  'merriweather':    LIBERATION_SERIF,
}

export function getFontPath(font: string): string {
  return FONT_PATH_MAP[font] ?? DEJAVU_BOLD
}

export interface SubtitleData {
  blocks: SubtitleBlock[]
  font_size: number
  color: string
  position: string
  font: string
  box: boolean
  shadow: boolean
}

export interface FilterComplexResult {
  filterComplex: string
  mapVideo: string
  mapAudio: string
}

export function buildFilterComplex(params: {
  segments: SilenceSegment[] | null
  clipStartSec: number
  clipEndSec: number
  cropX: number
  resolution: Resolution
  durationSec: number
  subtitleData: SubtitleData | null
  textFiles: string[]
}): FilterComplexResult {
  const { segments, clipStartSec, clipEndSec, cropX, resolution, durationSec, subtitleData, textFiles } = params
  const { w, h } = RESOLUTION_DIMS[resolution]
  const parts: string[] = []

  if (segments && segments.length > 1) {
    // Step 1: pre-clip trim to exact bounds (handles keyframe-alignment extra frames)
    // then split for per-segment silence removal
    const n = segments.length
    parts.push(`[0:v]trim=start=${clipStartSec.toFixed(3)}:end=${clipEndSec.toFixed(3)},setpts=PTS-STARTPTS[vclip]`)
    parts.push(`[0:a]atrim=start=${clipStartSec.toFixed(3)}:end=${clipEndSec.toFixed(3)},asetpts=PTS-STARTPTS[aclip]`)
    parts.push(`[vclip]split=${n}${segments.map((_, i) => `[vs${i}]`).join('')}`)
    parts.push(`[aclip]asplit=${n}${segments.map((_, i) => `[as${i}]`).join('')}`)
    // Step 2: per-segment trim (0-based after pre-clip setpts)
    for (let i = 0; i < n; i++) {
      const s = segments[i]
      parts.push(`[vs${i}]trim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},setpts=PTS-STARTPTS,setsar=1[v${i}]`)
      parts.push(`[as${i}]atrim=start=${s.start.toFixed(3)}:end=${s.end.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`)
    }
    const vInputs = segments.map((_, i) => `[v${i}][a${i}]`).join('')
    parts.push(`${vInputs}concat=n=${segments.length}:v=1:a=1[vcombined][acombined]`)

    const fade = buildFadeFilters(durationSec)
    const subtitleStr = buildSubtitleFilters(subtitleData, textFiles)
    const videoChain = [
      `crop=ih*9/16:ih:(iw-ih*9/16)*${cropX}:0,scale=${w}:${h}`,
      fade.video,
      subtitleStr,
    ].filter(Boolean).join(',')

    parts.push(`[vcombined]${videoChain}[vout]`)
    parts.push(`[acombined]${fade.audio}[aout]`)
  } else {
    // No silence removal: single stream
    const effectiveDuration = segments ? segments[0].end - segments[0].start : durationSec

    const fade = buildFadeFilters(effectiveDuration)
    const subtitleStr = buildSubtitleFilters(subtitleData, textFiles)
    const videoChain = [
      `crop=ih*9/16:ih:(iw-ih*9/16)*${cropX}:0,scale=${w}:${h}`,
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
  const fontPath = getFontPath(subtitleData.font ?? '')
  const boxOpts = subtitleData.box
    ? ':box=1:boxborderw=8:boxcolor=black@0.5'
    : ''
  const shadowOpts = subtitleData.shadow
    ? ':shadowx=3:shadowy=3:shadowcolor=black@0.8'
    : ''

  return subtitleData.blocks
    .map((block, i) => {
      if (!textFiles[i]) return null
      const startS = (block.start / 1000).toFixed(3)
      const endS   = (block.end   / 1000).toFixed(3)
      const tf = textFiles[i].replace(/\\/g, '/')
      return (
        `drawtext=textfile='${tf}'` +
        `:fontfile='${fontPath}'` +
        `:x=(w-text_w)/2:y=${y}` +
        `:fontsize=${subtitleData.font_size}` +
        `:fontcolor=0x${colorHex}` +
        `:borderw=3:bordercolor=black` +
        boxOpts +
        shadowOpts +
        `:enable='between(t,${startS},${endS})'`
      )
    })
    .filter(Boolean)
    .join(',')
}
