import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))
vi.mock('@/lib/openai', () => ({
  generateScript: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { generateScript } from '@/lib/openai'
import { POST } from '@/app/api/ai/script/route'

const mockCreateClient = vi.mocked(createClient)
const mockGenerateScript = vi.mocked(generateScript)

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/ai/script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/ai/script', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 if not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never)
    const res = await POST(makeRequest({ topic: 'fitness', platform: 'tiktok', duration: '30s', tone: 'funny' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 if plan is free', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { plan: 'free' } }) }) }) }),
    } as never)
    const res = await POST(makeRequest({ topic: 'fitness', platform: 'tiktok', duration: '30s', tone: 'funny' }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('plan_required')
  })

  it('returns script for creator plan', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { plan: 'creator' } }) }) }) }),
    } as never)
    mockGenerateScript.mockResolvedValue('This is a generated script.')
    const res = await POST(makeRequest({ topic: 'fitness', platform: 'tiktok', duration: '30s', tone: 'funny' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.script).toBe('This is a generated script.')
  })

  it('returns 400 for invalid platform', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { plan: 'creator' } }) }) }) }),
    } as never)
    const res = await POST(makeRequest({ topic: 'fitness', platform: 'invalid', duration: '30s', tone: 'funny' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for empty topic', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { plan: 'creator' } }) }) }) }),
    } as never)
    const res = await POST(makeRequest({ topic: '', platform: 'tiktok', duration: '30s', tone: 'funny' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid tone', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { plan: 'creator' } }) }) }) }),
    } as never)
    const res = await POST(makeRequest({ topic: 'fitness', platform: 'tiktok', duration: '30s', tone: 'invalid' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid duration', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { plan: 'creator' } }) }) }) }),
    } as never)
    const res = await POST(makeRequest({ topic: 'fitness', platform: 'tiktok', duration: '2m', tone: 'funny' }))
    expect(res.status).toBe(400)
  })
})
