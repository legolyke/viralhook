import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSingle = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }),
    },
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => mockSingle()),
    })),
  }),
}))

import { GET } from '@/app/api/clips/[id]/status/route'

describe('GET /api/clips/[id]/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const req = new Request('http://localhost')
    const res = await GET(req, { params: Promise.resolve({ id: 'clip-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when clip not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null })

    const req = new Request('http://localhost')
    const res = await GET(req, { params: Promise.resolve({ id: 'clip-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns status and file_url for a ready clip', async () => {
    mockSingle.mockResolvedValue({
      data: { status: 'ready', file_url: 'https://pub.r2.dev/clips/clip-1.mp4' },
      error: null,
    })

    const req = new Request('http://localhost')
    const res = await GET(req, { params: Promise.resolve({ id: 'clip-1' }) })
    const body = await res.json() as { status: string; file_url: string }
    expect(res.status).toBe(200)
    expect(body.status).toBe('ready')
    expect(body.file_url).toBe('https://pub.r2.dev/clips/clip-1.mp4')
  })

  it('returns status = processing with null file_url while in progress', async () => {
    mockSingle.mockResolvedValue({
      data: { status: 'processing', file_url: null },
      error: null,
    })

    const req = new Request('http://localhost')
    const res = await GET(req, { params: Promise.resolve({ id: 'clip-1' }) })
    const body = await res.json() as { status: string; file_url: null }
    expect(res.status).toBe(200)
    expect(body.status).toBe('processing')
    expect(body.file_url).toBeNull()
  })
})
