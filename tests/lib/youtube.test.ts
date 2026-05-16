import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.hoisted(() => vi.fn())
vi.stubGlobal('fetch', mockFetch)

import { getAuthUrl, exchangeCode, refreshAccessToken, getChannelInfo } from '@/lib/youtube'

describe('getAuthUrl', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client-id')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.com')
  })

  it('returns a valid Google OAuth URL', () => {
    const url = getAuthUrl()
    expect(url).toContain('accounts.google.com/o/oauth2/v2/auth')
    expect(url).toContain('test-client-id')
    expect(url).toContain('youtube.upload')
    expect(url).toContain('access_type=offline')
  })
})

describe('exchangeCode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client-id')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.com')
  })

  it('returns tokens on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'acc_123', refresh_token: 'ref_456' }),
    })
    const result = await exchangeCode('auth-code-abc')
    expect(result.access_token).toBe('acc_123')
    expect(result.refresh_token).toBe('ref_456')
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })
    await expect(exchangeCode('bad-code')).rejects.toThrow('Failed to exchange code')
  })
})

describe('refreshAccessToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client-id')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret')
  })

  it('returns new access token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'new_acc_789' }),
    })
    const token = await refreshAccessToken('ref_token')
    expect(token).toBe('new_acc_789')
  })

  it('throws on failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })
    await expect(refreshAccessToken('bad_ref')).rejects.toThrow('Failed to refresh token')
  })
})

describe('getChannelInfo', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns channel id and name', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: 'UC_channel_123', snippet: { title: 'My Channel' } }],
      }),
    })
    const info = await getChannelInfo('access_token')
    expect(info.channelId).toBe('UC_channel_123')
    expect(info.channelName).toBe('My Channel')
  })

  it('throws if no channel found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    })
    await expect(getChannelInfo('token')).rejects.toThrow('No YouTube channel found')
  })
})
