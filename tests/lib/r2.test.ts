import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock env vars before importing r2
vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'test-account-id')
vi.stubEnv('R2_ACCESS_KEY_ID', 'test-key')
vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test-secret')
vi.stubEnv('R2_BUCKET_NAME', 'test-bucket')
vi.stubEnv('R2_PUBLIC_URL', 'https://pub-abc123.r2.dev')

// Mock the S3Client to avoid real AWS calls
vi.mock('@aws-sdk/client-s3', () => {
  const mockSend = vi.fn()
  class MockS3Client {
    send = mockSend
    constructor(_config: unknown) {}
  }
  return {
    S3Client: MockS3Client,
    PutObjectCommand: vi.fn(),
    DeleteObjectCommand: vi.fn(),
  }
})
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://presigned.url'),
}))

describe('getR2KeyFromUrl', () => {
  it('extracts key from full public URL', async () => {
    const { getR2KeyFromUrl } = await import('@/lib/r2')
    const url = 'https://pub-abc123.r2.dev/user-id/uuid/video.mp4'
    expect(getR2KeyFromUrl(url)).toBe('user-id/uuid/video.mp4')
  })

  it('handles nested path keys', async () => {
    const { getR2KeyFromUrl } = await import('@/lib/r2')
    const url = 'https://pub-abc123.r2.dev/a/b/c/d.mp4'
    expect(getR2KeyFromUrl(url)).toBe('a/b/c/d.mp4')
  })
})
