import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.hoisted(() => vi.fn())
vi.stubGlobal('fetch', mockFetch)

import { detectViralClips } from '@/lib/openai'

const mockWords = [
  { text: 'Hello', start: 200, end: 800, confidence: 0.99 },
  { text: 'world', start: 900, end: 1400, confidence: 0.98 },
  { text: 'this', start: 1500, end: 1700, confidence: 0.97 },
  { text: 'is', start: 1800, end: 1900, confidence: 0.96 },
  { text: 'amazing', start: 2000, end: 2800, confidence: 0.95 },
]
const mockHighlights = [
  { text: 'Hello world', rank: 0.9, timestamps: [{ start: 200, end: 1400 }] },
]

const mockClipsResponse = {
  clips: [
    { title: 'Amazing moment', start_ms: 200, end_ms: 20000, score: 0.9 },
  ],
}

describe('detectViralClips', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('OPENAI_API_KEY', 'sk-test-key')
  })

  it('throws if OPENAI_API_KEY is not set', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    await expect(detectViralClips(mockWords, mockHighlights, 'Hello world this is amazing'))
      .rejects.toThrow('OPENAI_API_KEY is not set')
  })

  it('returns parsed clips on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockClipsResponse) } }],
      }),
    })
    const clips = await detectViralClips(mockWords, mockHighlights, 'Hello world this is amazing')
    expect(clips).toHaveLength(1)
    expect(clips[0].title).toBe('Amazing moment')
    expect(clips[0].start_ms).toBe(200)
    expect(clips[0].score).toBe(0.9)
  })

  it('calls gpt-4o-mini with correct model', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockClipsResponse) } }],
      }),
    })
    await detectViralClips(mockWords, mockHighlights, 'Hello world')
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.model).toBe('gpt-4o-mini')
    expect(body.response_format).toEqual({ type: 'json_object' })
    const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer sk-test-key')
  })

  it('throws on OpenAI API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    })
    await expect(detectViralClips(mockWords, mockHighlights, 'Hello world'))
      .rejects.toThrow('OpenAI error 429')
  })

  it('throws on invalid JSON response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'not json at all' } }],
      }),
    })
    await expect(detectViralClips(mockWords, mockHighlights, 'Hello world'))
      .rejects.toThrow('invalid JSON')
  })

  it('throws when clips array is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ result: [] }) } }],
      }),
    })
    await expect(detectViralClips(mockWords, mockHighlights, 'Hello world'))
      .rejects.toThrow('missing clips array')
  })

  it('returns empty array when GPT returns no clips', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({ clips: [] }) } }] }),
    })
    const clips = await detectViralClips(mockWords, mockHighlights, 'Hello world')
    expect(clips).toHaveLength(0)
  })

  it('filters out clips with duration under 15 seconds', async () => {
    const response = {
      clips: [
        { title: 'Good clip', start_ms: 0, end_ms: 30000, score: 0.8 },
        { title: 'Too short', start_ms: 0, end_ms: 10000, score: 0.9 },
      ],
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(response) } }] }),
    })
    const clips = await detectViralClips(mockWords, mockHighlights, 'Hello world')
    expect(clips).toHaveLength(1)
    expect(clips[0].title).toBe('Good clip')
  })

  it('filters out clips with duration over 60 seconds', async () => {
    const response = {
      clips: [
        { title: 'Good clip', start_ms: 0, end_ms: 30000, score: 0.8 },
        { title: 'Too long', start_ms: 0, end_ms: 70000, score: 0.9 },
      ],
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(response) } }] }),
    })
    const clips = await detectViralClips(mockWords, mockHighlights, 'Hello world')
    expect(clips).toHaveLength(1)
    expect(clips[0].title).toBe('Good clip')
  })
})
