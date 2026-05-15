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
