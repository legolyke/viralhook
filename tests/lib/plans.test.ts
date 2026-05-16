import { describe, it, expect } from 'vitest'
import {
  PLAN_LIMITS,
  getPlanLimit,
  isAtLimit,
  VOICEOVER_LIMITS,
  getVoiceoverLimit,
  isAtVoiceoverLimit,
  canUseAITools,
  canUseVoiceover,
  type PlanName,
} from '@/lib/plans'

describe('PLAN_LIMITS', () => {
  it('has correct limits for all plans', () => {
    expect(PLAN_LIMITS.free).toBe(3)
    expect(PLAN_LIMITS.creator).toBe(40)
    expect(PLAN_LIMITS.pro).toBe(150)
    expect(PLAN_LIMITS.agency).toBe(2000)
  })
})

describe('getPlanLimit', () => {
  it('returns limit for known plan', () => {
    expect(getPlanLimit('free')).toBe(3)
    expect(getPlanLimit('agency')).toBe(2000)
  })

  it('returns free limit for unknown plan', () => {
    expect(getPlanLimit('unknown' as PlanName)).toBe(3)
  })
})

describe('isAtLimit', () => {
  it('returns true when exports_used equals limit', () => {
    expect(isAtLimit('free', 3)).toBe(true)
  })

  it('returns true when exports_used exceeds limit', () => {
    expect(isAtLimit('free', 5)).toBe(true)
  })

  it('returns false when below limit', () => {
    expect(isAtLimit('free', 2)).toBe(false)
    expect(isAtLimit('pro', 149)).toBe(false)
  })
})

describe('VOICEOVER_LIMITS', () => {
  it('has correct values per plan', () => {
    expect(VOICEOVER_LIMITS.free).toBe(0)
    expect(VOICEOVER_LIMITS.creator).toBe(0)
    expect(VOICEOVER_LIMITS.pro).toBe(50)
    expect(VOICEOVER_LIMITS.agency).toBe(300)
  })
})

describe('getVoiceoverLimit', () => {
  it('returns correct limit per plan', () => {
    expect(getVoiceoverLimit('free')).toBe(0)
    expect(getVoiceoverLimit('creator')).toBe(0)
    expect(getVoiceoverLimit('pro')).toBe(50)
    expect(getVoiceoverLimit('agency')).toBe(300)
  })
})

describe('isAtVoiceoverLimit', () => {
  it('returns true when at limit', () => {
    expect(isAtVoiceoverLimit('pro', 50)).toBe(true)
    expect(isAtVoiceoverLimit('agency', 300)).toBe(true)
  })
  it('returns false when under limit', () => {
    expect(isAtVoiceoverLimit('pro', 49)).toBe(false)
    expect(isAtVoiceoverLimit('agency', 0)).toBe(false)
  })
  it('returns true for free/creator (limit is 0)', () => {
    expect(isAtVoiceoverLimit('free', 0)).toBe(true)
    expect(isAtVoiceoverLimit('creator', 0)).toBe(true)
  })
})

describe('canUseAITools', () => {
  it('returns false for free', () => expect(canUseAITools('free')).toBe(false))
  it('returns true for creator', () => expect(canUseAITools('creator')).toBe(true))
  it('returns true for pro', () => expect(canUseAITools('pro')).toBe(true))
  it('returns true for agency', () => expect(canUseAITools('agency')).toBe(true))
})

describe('canUseVoiceover', () => {
  it('returns false for free', () => expect(canUseVoiceover('free')).toBe(false))
  it('returns false for creator', () => expect(canUseVoiceover('creator')).toBe(false))
  it('returns true for pro', () => expect(canUseVoiceover('pro')).toBe(true))
  it('returns true for agency', () => expect(canUseVoiceover('agency')).toBe(true))
})
