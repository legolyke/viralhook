import { describe, it, expect } from 'vitest'
import { buildCropFilter } from '../../workers/clip-processor/crop'

describe('buildCropFilter', () => {
  it('generates correct filter for crop_x = 0 (leftmost position)', () => {
    expect(buildCropFilter(0)).toBe(
      'crop=ih*9/16:ih:(iw-ih*9/16)*0:0,scale=1080:1920'
    )
  })

  it('generates correct filter for crop_x = 1 (rightmost position)', () => {
    expect(buildCropFilter(1)).toBe(
      'crop=ih*9/16:ih:(iw-ih*9/16)*1:0,scale=1080:1920'
    )
  })

  it('generates correct filter for crop_x = 0.5 (center)', () => {
    expect(buildCropFilter(0.5)).toBe(
      'crop=ih*9/16:ih:(iw-ih*9/16)*0.5:0,scale=1080:1920'
    )
  })
})
