import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.hoisted(() => vi.fn())
vi.stubGlobal('fetch', mockFetch)

import { startTranscription, getTranscript, verifyWebhookSecret } from '@/lib/assemblyai'

describe('startTranscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('ASSEMBLYAI_API_KEY', 'test-key')
    vi.stubEnv('ASSEMBLYAI_WEBHOOK_SECRET', 'test-secret')
  })

  it('returns job id on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'job_abc123' }),
    })
    const id = await startTranscription(
      'https://r2.example.com/video.mp4',
      'https://app.example.com/api/transcribe/webhook'
    )
    expect(id).toBe('job_abc123')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.assemblyai.com/v2/transcript',
      expect.objectContaining({ method: 'POST' })
    )
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.audio_url).toBe('https://r2.example.com/video.mp4')
    expect(body.auto_highlights).toBe(true)
    expect(body.webhook_url).toBe('https://app.example.com/api/transcribe/webhook')
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    })
    await expect(
      startTranscription('https://r2.example.com/video.mp4', 'https://app.example.com/api/transcribe/webhook')
    ).rejects.toThrow('AssemblyAI error 401')
  })
})

describe('getTranscript', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('ASSEMBLYAI_API_KEY', 'test-key')
  })

  it('returns transcript on success', async () => {
    const mockTranscript = {
      id: 'job_abc123',
      status: 'completed',
      text: 'Hello world',
      words: [{ text: 'Hello', start: 0, end: 500, confidence: 0.99 }],
      auto_highlights_result: { results: [] },
      language_code: 'en',
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTranscript,
    })
    const result = await getTranscript('job_abc123')
    expect(result.id).toBe('job_abc123')
    expect(result.text).toBe('Hello world')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.assemblyai.com/v2/transcript/job_abc123',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'test-key' }) })
    )
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'Not found' })
    await expect(getTranscript('bad_id')).rejects.toThrow('AssemblyAI error 404')
  })
})

describe('verifyWebhookSecret', () => {
  it('returns true when secrets match', () => {
    expect(verifyWebhookSecret('my-secret', 'my-secret')).toBe(true)
  })

  it('returns false when secrets differ', () => {
    expect(verifyWebhookSecret('wrong', 'my-secret')).toBe(false)
  })

  it('returns false when provided is null', () => {
    expect(verifyWebhookSecret(null, 'my-secret')).toBe(false)
  })

  it('returns false when either is empty string', () => {
    expect(verifyWebhookSecret('', 'my-secret')).toBe(false)
    expect(verifyWebhookSecret('my-secret', '')).toBe(false)
  })
})
