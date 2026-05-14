import type { AssemblyAIWord } from './assemblyai'

export interface SubBlock {
  start: number
  end: number
  text: string
}

export type SubtitlePosition = 'bottom' | 'top'
export type SubtitleFontSize = 'small' | 'medium' | 'large'

export interface SubtitleStyle {
  position: SubtitlePosition
  font_size: SubtitleFontSize
  color: string  // hex e.g. '#FFFFFF'
  font: string   // key: 'arial' | 'roboto' | 'ubuntu' | 'oswald'
}

const FONT_ASS_MAP: Record<string, string> = {
  arial:  'Liberation Sans',
  roboto: 'Roboto',
  ubuntu: 'Ubuntu',
  oswald: 'Oswald',
}

const FONT_SIZE_MAP: Record<SubtitleFontSize, number> = {
  small: 44,
  medium: 56,
  large: 68,
}

// ASS uses &H00BBGGRR (alpha=00, then BGR order)
function hexToAss(hex: string): string {
  const h = hex.replace('#', '').padEnd(6, 'F')
  const r = h.slice(0, 2)
  const g = h.slice(2, 4)
  const b = h.slice(4, 6)
  return `&H00${b}${g}${r}`.toUpperCase()
}

export function buildSubtitleBlocks(
  words: AssemblyAIWord[],
  clipStartMs: number,
  clipEndMs: number,
  wordsPerBlock = 4,
): SubBlock[] {
  const clipped = words.filter(w => w.start >= clipStartMs && w.start < clipEndMs)
  const blocks: SubBlock[] = []
  let current: AssemblyAIWord[] = []

  for (const word of clipped) {
    current.push(word)
    const duration = word.end - current[0].start
    if (current.length >= wordsPerBlock || duration >= 3000) {
      blocks.push({
        start: Math.max(0, current[0].start - clipStartMs),
        end: Math.max(0, word.end - clipStartMs),
        text: current.map(w => w.text).join(' '),
      })
      current = []
    }
  }

  if (current.length > 0) {
    blocks.push({
      start: Math.max(0, current[0].start - clipStartMs),
      end: Math.max(0, current[current.length - 1].end - clipStartMs),
      text: current.map(w => w.text).join(' '),
    })
  }

  return blocks
}

export function blocksToSrt(blocks: SubBlock[]): string {
  return blocks
    .map((b, i) => `${i + 1}\n${srtTime(b.start)} --> ${srtTime(b.end)}\n${b.text}`)
    .join('\n\n')
}

export function blocksToAss(blocks: SubBlock[], style: SubtitleStyle): string {
  const fontSize = FONT_SIZE_MAP[style.font_size]
  const alignment = style.position === 'top' ? 8 : 2
  const color = hexToAss(style.color)
  const fontName = FONT_ASS_MAP[style.font] ?? 'Liberation Sans'

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${color},&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,3,1,${alignment},20,20,80,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`

  const events = blocks
    .map(b => `Dialogue: 0,${assTime(b.start)},${assTime(b.end)},Default,,0,0,0,,${b.text}`)
    .join('\n')

  return `${header}\n${events}`
}

function srtTime(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const r = ms % 1000
  return `${p2(h)}:${p2(m)}:${p2(s)},${p3(r)}`
}

function assTime(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  return `${h}:${p2(m)}:${p2(s)}.${p2(cs)}`
}

function p2(n: number) { return n.toString().padStart(2, '0') }
function p3(n: number) { return n.toString().padStart(3, '0') }
