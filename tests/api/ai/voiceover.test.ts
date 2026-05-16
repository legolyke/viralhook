import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))
vi.mock('@/lib/openai', () => ({
  generateVoiceover: vi.fn(),
}))

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateVoiceover } from '@/lib/openai'
import { POST } from '@/app/api/ai/voiceover/route'

const mockCreateClient = vi.mocked(createClient)
const mockCreateServiceClient = vi.mocked(createServiceClient)
const mockGenerateVoiceover = vi.mocked(generateVoiceover)

function makeSubMock(plan: string, voiceover_used: number) {
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { plan, voiceover_used } }) }) }),
    }),
  }
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/ai/voiceover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/ai/voiceover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateServiceClient.mockReturnValue({
      from: () => ({
        update: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }),
    } as never)
  })

  it('returns 401 if not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never)
    const res = await POST(makeRequest({ text: 'hello', voice: 'alloy' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 if plan is free', async () => {
    mockCreateClient.mockResolvedValue(makeSubMock('free', 0) as never)
    const res = await POST(makeRequest({ text: 'hello', voice: 'alloy' }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('plan_required')
  })

  it('returns 403 if plan is creator', async () => {
    mockCreateClient.mockResolvedValue(makeSubMock('creator', 0) as never)
    const res = await POST(makeRequest({ text: 'hello', voice: 'alloy' }))
    expect(res.status).toBe(403)
  })

  it('returns 403 if voiceover limit reached', async () => {
    mockCreateClient.mockResolvedValue(makeSubMock('pro', 50) as never)
    const res = await POST(makeRequest({ text: 'hello', voice: 'alloy' }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('voiceover_limit_reached')
  })

  it('returns audio/mpeg for pro plan with capacity', async () => {
    mockCreateClient.mockResolvedValue(makeSubMock('pro', 10) as never)
    mockGenerateVoiceover.mockResolvedValue(Buffer.from('fake-audio'))
    const res = await POST(makeRequest({ text: 'Hello world', voice: 'nova' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('audio/mpeg')
  })

  it('returns 400 if text is empty', async () => {
    mockCreateClient.mockResolvedValue(makeSubMock('pro', 0) as never)
    const res = await POST(makeRequest({ text: '', voice: 'alloy' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 if voice is invalid', async () => {
    mockCreateClient.mockResolvedValue(makeSubMock('pro', 0) as never)
    const res = await POST(makeRequest({ text: 'hello', voice: 'invalid-voice' }))
    expect(res.status).toBe(400)
  })
})
