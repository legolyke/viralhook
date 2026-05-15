import { describe, it, expect } from 'vitest'
import { buildZoomFilter, buildFadeFilters, parseSilenceOutput, remapSubtitleBlocks, buildFilterComplex, type SilenceSegment } from '../../server/filters'

describe('buildZoomFilter', () => {
  it('returns zoompan expression with correct dimensions', () => {
    const result = buildZoomFilter(1080, 1920)
    expect(result).toBe(
      "zoompan=z='1.025+0.025*sin(2*PI*t/6)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920"
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

describe('buildFilterComplex', () => {
  it('no silence: produces single-stream filter with crop+fade', () => {
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
    expect(filterComplex).toContain('fade=t=in:st=0')
    expect(filterComplex).toContain('[vout]')
    expect(filterComplex).toContain('[aout]')
  })

  it('with silence: produces trim+concat+crop+fade', () => {
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
