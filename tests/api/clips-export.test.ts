import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.hoisted(() => vi.fn())
vi.stubGlobal('fetch', mockFetch)

const mockSingle = vi.hoisted(() => vi.fn())
const mockUpdate = vi.hoisted(() => vi.fn())

const mockSvcUpdate = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123', phone_confirmed_at: '2024-01-01T00:00:00Z' } },
      }),
    },
    from: vi.fn().mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue(mockUpdate()),
      })),
      single: vi.fn().mockImplementation(() => mockSingle(table)),
    })),
  }),
  createServiceClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(mockSvcUpdate()),
      }),
    }),
  }),
}))

import { POST } from '@/app/api/clips/[id]/export/route'

const mockClip = {
  id: 'clip-1',
  project_id: 'proj-1',
  user_id: 'user-123',
  start_time: 5000,
  end_time: 35000,
  status: 'detected',
}
const mockProject = {
  file_url: 'https://pub.r2.dev/uploads/proj-1/video.mp4',
}
const mockSub = {
  plan: 'pro',
  exports_used: 0,
}

describe('POST /api/clips/[id]/export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('WORKER_URL', 'https://test-worker.workers.dev')
    vi.stubEnv('WORKER_SECRET', 'test-secret')
    vi.stubEnv('R2_PUBLIC_URL', 'https://pub.r2.dev')
  })

  it('returns 401 when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crop_x: 0.5 }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'clip-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when phone not verified', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } }, // no phone_confirmed_at
        }),
      },
      from: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crop_x: 0.5 }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'clip-1' }) })
    expect(res.status).toBe(403)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('phone_required')
  })

  it('returns 403 when plan limit reached', async () => {
    mockSingle.mockImplementation(() => ({
      data: { plan: 'free', exports_used: 10 },
      error: null,
    }))

    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crop_x: 0.5 }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'clip-1' }) })
    expect(res.status).toBe(403)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('limit_reached')
  })

  it('returns 404 when clip not found', async () => {
    mockSingle.mockImplementation((table: string) => {
      if (table === 'subscriptions') return { data: mockSub, error: null }
      return { data: null, error: null }
    })

    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crop_x: 0.5 }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'clip-1' }) })
    expect(res.status).toBe(404)
  })

  it('calls Worker and returns ok:true on success', async () => {
    mockSingle.mockImplementation((table: string) => {
      if (table === 'subscriptions') return { data: mockSub, error: null }
      if (table === 'clips') return { data: mockClip, error: null }
      return { data: mockProject, error: null }
    })
    mockUpdate.mockReturnValue({ error: null })
    mockSvcUpdate.mockReturnValue({ error: null })
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })

    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crop_x: 0.5 }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'clip-1' }) })
    const body = await res.json() as { ok: boolean }
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)

    const workerCall = mockFetch.mock.calls[0]
    expect(workerCall[0]).toBe('https://test-worker.workers.dev')
    const workerBody = JSON.parse((workerCall[1] as RequestInit).body as string)
    expect(workerBody.clip_id).toBe('clip-1')
    expect(workerBody.crop_x).toBe(0.5)
    expect(workerBody.start_time).toBe(5000)
    expect(workerBody.end_time).toBe(35000)
    expect(workerBody.source_key).toBe('uploads/proj-1/video.mp4')
  })

  it('sets status to error and returns 500 when Worker fails', async () => {
    mockSingle.mockImplementation((table: string) => {
      if (table === 'subscriptions') return { data: mockSub, error: null }
      if (table === 'clips') return { data: mockClip, error: null }
      return { data: mockProject, error: null }
    })
    mockUpdate.mockReturnValue({ error: null })
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crop_x: 0.5 }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'clip-1' }) })
    expect(res.status).toBe(500)
  })

  it('returns 400 when crop_x is missing', async () => {
    mockSingle.mockImplementation(() => ({ data: mockSub, error: null }))

    const req = new Request('http://localhost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'clip-1' }) })
    expect(res.status).toBe(400)
  })
})
