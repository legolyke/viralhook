import { describe, it, expect } from 'vitest'
import {
  validateFileFormat,
  validateDuration,
  PLAN_LIMITS,
  ACCEPTED_EXTENSIONS,
} from '@/lib/upload-validator'

describe('validateFileFormat', () => {
  it('accepts .mp4 files', () => {
    expect(validateFileFormat('video.mp4').valid).toBe(true)
  })

  it('accepts .MP4 files (case insensitive)', () => {
    expect(validateFileFormat('video.MP4').valid).toBe(true)
  })

  it('accepts .mov files', () => {
    expect(validateFileFormat('video.mov').valid).toBe(true)
  })

  it('rejects .avi files', () => {
    const result = validateFileFormat('video.avi')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Only MP4 and MOV files are supported.')
  })

  it('rejects .mkv files', () => {
    expect(validateFileFormat('video.mkv').valid).toBe(false)
  })
})

describe('validateDuration', () => {
  it('allows FREE plan video under 30 min', () => {
    expect(validateDuration(1700, 'free').valid).toBe(true)
  })

  it('rejects FREE plan video over 30 min', () => {
    const result = validateDuration(1801, 'free')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('FREE')
    expect(result.error).toContain('30 min')
  })

  it('allows CREATOR plan video up to 2h', () => {
    expect(validateDuration(7200, 'creator').valid).toBe(true)
  })

  it('rejects CREATOR plan video over 2h', () => {
    const result = validateDuration(7201, 'creator')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('2h')
  })

  it('allows PRO plan video up to 4h', () => {
    expect(validateDuration(14400, 'pro').valid).toBe(true)
  })

  it('rejects PRO plan video over 4h', () => {
    const result = validateDuration(14401, 'pro')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('4h')
  })

  it('allows AGENCY plan video up to 6h', () => {
    expect(validateDuration(21600, 'agency').valid).toBe(true)
  })

  it('rejects AGENCY plan video over 6h', () => {
    expect(validateDuration(21601, 'agency').valid).toBe(false)
  })
})

describe('PLAN_LIMITS', () => {
  it('has correct seconds for free plan', () => {
    expect(PLAN_LIMITS.free.maxDurationSeconds).toBe(30 * 60)
  })

  it('has correct seconds for creator plan', () => {
    expect(PLAN_LIMITS.creator.maxDurationSeconds).toBe(2 * 60 * 60)
  })

  it('has correct seconds for pro plan', () => {
    expect(PLAN_LIMITS.pro.maxDurationSeconds).toBe(4 * 60 * 60)
  })

  it('has correct seconds for agency plan', () => {
    expect(PLAN_LIMITS.agency.maxDurationSeconds).toBe(6 * 60 * 60)
  })
})
