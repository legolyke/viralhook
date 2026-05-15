import { describe, it, expect } from 'vitest'
import { PLAN_LIMITS, getPlanLimit, isAtLimit, type PlanName } from '@/lib/plans'

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
