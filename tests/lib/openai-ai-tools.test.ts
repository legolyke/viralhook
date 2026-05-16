import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.hoisted(() => vi.fn())
vi.stubGlobal('fetch', mockFetch)

import { generateScript, generateIdeas, generateVoiceover } from '@/lib/openai'

describe('generateScript', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
  })

  it('returns a script string', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Hook line. Main content. CTA.' } }] }),
    })
    const result = await generateScript('fitness tips', 'tiktok', '30s', 'funny')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, text: async () => 'error' })
    await expect(generateScript('topic', 'tiktok', '30s', 'funny')).rejects.toThrow('OpenAI error')
  })

  it('throws if OPENAI_API_KEY missing', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    await expect(generateScript('topic', 'tiktok', '30s', 'funny')).rejects.toThrow('OPENAI_API_KEY')
  })
})

describe('generateIdeas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
  })

  it('returns array of ideas', async () => {
    const ideas = [
      { title: '5 gym mistakes', hook: 'You are wasting your time at the gym', description: 'Common mistakes beginners make' },
    ]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({ ideas }) } }] }),
    })
    const result = await generateIdeas('fitness', 'tiktok')
    expect(Array.isArray(result)).toBe(true)
    expect(result[0].title).toBe('5 gym mistakes')
    expect(result[0].hook).toBeDefined()
    expect(result[0].description).toBeDefined()
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, text: async () => 'err' })
    await expect(generateIdeas('fitness', 'tiktok')).rejects.toThrow('OpenAI error')
  })
})

describe('generateVoiceover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('OPENAI_API_KEY', 'test-key')
  })

  it('returns a Buffer', async () => {
    const fakeBuffer = Buffer.from('fake-audio-data')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => fakeBuffer.buffer,
    })
    const result = await generateVoiceover('Hello world', 'alloy')
    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, text: async () => 'err' })
    await expect(generateVoiceover('text', 'nova')).rejects.toThrow('OpenAI error')
  })
})
