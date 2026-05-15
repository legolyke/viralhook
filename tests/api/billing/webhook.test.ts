import { describe, it, expect } from 'vitest'
import { resolveWebhookPlan } from '@/app/api/billing/webhook/route'

describe('resolveWebhookPlan', () => {
  it('returns creator for creator price id', () => {
    expect(resolveWebhookPlan('price_creator_123', {
      price_creator: 'price_creator_123',
      price_pro: 'price_pro_456',
      price_agency: 'price_agency_789',
    })).toBe('creator')
  })

  it('returns pro for pro price id', () => {
    expect(resolveWebhookPlan('price_pro_456', {
      price_creator: 'price_creator_123',
      price_pro: 'price_pro_456',
      price_agency: 'price_agency_789',
    })).toBe('pro')
  })

  it('returns agency for agency price id', () => {
    expect(resolveWebhookPlan('price_agency_789', {
      price_creator: 'price_creator_123',
      price_pro: 'price_pro_456',
      price_agency: 'price_agency_789',
    })).toBe('agency')
  })

  it('returns null for unknown price id', () => {
    expect(resolveWebhookPlan('price_unknown', {
      price_creator: 'price_creator_123',
      price_pro: 'price_pro_456',
      price_agency: 'price_agency_789',
    })).toBeNull()
  })
})
