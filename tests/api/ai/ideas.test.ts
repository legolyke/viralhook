import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))
vi.mock('@/lib/openai', () => ({
  generateIdeas: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { generateIdeas } from '@/lib/openai'
import { POST } from '@/app/api/ai/ideas/route'

const mockCreateClient = vi.mocked(createClient)
const mockGenerateIdeas = vi.mocked(generateIdeas)

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/ai/ideas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/ai/ideas', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 if not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never)
    const res = await POST(makeRequest({ niche: 'fitness', platform: 'tiktok' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 if plan is free', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { plan: 'free' } }) }) }) }),
    } as never)
    const res = await POST(makeRequest({ niche: 'fitness', platform: 'tiktok' }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('plan_required')
  })

  it('returns ideas array for creator plan', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { plan: 'creator' } }) }) }) }),
    } as never)
    mockGenerateIdeas.mockResolvedValue([
      { title: '5 gym mistakes', hook: 'You are wasting your time', description: 'Common beginner errors' },
    ])
    const res = await POST(makeRequest({ niche: 'fitness', platform: 'tiktok' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.ideas)).toBe(true)
    expect(body.ideas[0].title).toBe('5 gym mistakes')
  })

  it('returns 400 if niche is empty', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { plan: 'creator' } }) }) }) }),
    } as never)
    const res = await POST(makeRequest({ niche: '', platform: 'tiktok' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid platform', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { plan: 'creator' } }) }) }) }),
    } as never)
    const res = await POST(makeRequest({ niche: 'fitness', platform: 'invalid' }))
    expect(res.status).toBe(400)
  })
})
