import crypto from 'crypto'

const INSTAGRAM_AUTH_URL = 'https://www.instagram.com/oauth/authorize'
const INSTAGRAM_TOKEN_URL = 'https://api.instagram.com/oauth/access_token'
const INSTAGRAM_LONG_TOKEN_URL = 'https://graph.instagram.com/access_token'
const GRAPH_URL = 'https://graph.instagram.com/v22.0'

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/instagram/callback`,
    scope: 'instagram_business_basic,instagram_content_publish',
    response_type: 'code',
    state,
  })
  return `${INSTAGRAM_AUTH_URL}?${params}`
}

export async function exchangeCode(code: string): Promise<{
  access_token: string
  user_id: string
}> {
  const body = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    grant_type: 'authorization_code',
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/instagram/callback`,
    code,
  })
  const res = await fetch(INSTAGRAM_TOKEN_URL, { method: 'POST', body })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Instagram token exchange failed: ${res.status} ${text}`)
  }
  const data = await res.json() as {
    access_token?: string
    user_id?: number
    error_message?: string
    error_type?: string
  }
  if (!data.access_token) {
    throw new Error(`Instagram auth error: ${data.error_message ?? 'missing access_token'}`)
  }
  return { access_token: data.access_token, user_id: String(data.user_id ?? '') }
}

export async function getLongLivedToken(shortToken: string): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    access_token: shortToken,
  })
  const res = await fetch(`${INSTAGRAM_LONG_TOKEN_URL}?${params}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Instagram long-lived token failed: ${res.status} ${text}`)
  }
  const data = await res.json() as { access_token?: string; error?: { message: string } }
  if (data.error) throw new Error(`Instagram long token error: ${data.error.message}`)
  if (!data.access_token) throw new Error('Instagram long token: missing access_token')
  return data.access_token
}

export async function getUserInfo(accessToken: string): Promise<{
  userId: string
  username: string
}> {
  const params = new URLSearchParams({ fields: 'id,username', access_token: accessToken })
  const res = await fetch(`${GRAPH_URL}/me?${params}`)
  if (!res.ok) throw new Error(`Instagram user info failed: ${res.status}`)
  const data = await res.json() as {
    id?: string
    username?: string
    error?: { message: string; code: number }
  }
  if (data.error) throw new Error(`Instagram user info error: ${data.error.message} (${data.error.code})`)
  return {
    userId: data.id ?? '',
    username: data.username ?? 'Instagram User',
  }
}

export async function createReelContainer(
  accessToken: string,
  userId: string,
  videoUrl: string,
  caption: string
): Promise<string> {
  const res = await fetch(`${GRAPH_URL}/${userId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'REELS',
      video_url: videoUrl,
      caption,
      share_to_feed: true,
      access_token: accessToken,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Instagram media container failed: ${res.status} ${text}`)
  }
  const data = await res.json() as {
    id?: string
    error?: { message: string; code: number }
  }
  if (data.error) throw new Error(`Instagram container error: ${data.error.message} (${data.error.code})`)
  if (!data.id) throw new Error('Instagram container: missing id')
  return data.id
}

export async function getContainerStatus(
  accessToken: string,
  containerId: string
): Promise<'IN_PROGRESS' | 'FINISHED' | 'ERROR' | 'EXPIRED' | 'PUBLISHED'> {
  const params = new URLSearchParams({ fields: 'status_code', access_token: accessToken })
  const res = await fetch(`${GRAPH_URL}/${containerId}?${params}`)
  if (!res.ok) throw new Error(`Instagram container status failed: ${res.status}`)
  const data = await res.json() as { status_code?: string }
  return (data.status_code ?? 'IN_PROGRESS') as 'IN_PROGRESS' | 'FINISHED' | 'ERROR' | 'EXPIRED' | 'PUBLISHED'
}

export async function publishReel(
  accessToken: string,
  userId: string,
  containerId: string
): Promise<string> {
  const res = await fetch(`${GRAPH_URL}/${userId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: accessToken,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Instagram publish failed: ${res.status} ${text}`)
  }
  const data = await res.json() as {
    id?: string
    error?: { message: string; code: number }
  }
  if (data.error) throw new Error(`Instagram publish error: ${data.error.message} (${data.error.code})`)
  if (!data.id) throw new Error('Instagram publish: missing media id')
  return data.id
}

export function verifySignedRequest(signedRequest: string): Record<string, unknown> | null {
  const parts = signedRequest.split('.')
  if (parts.length !== 2) return null
  const [encodedSig, payload] = parts as [string, string]
  const secret = process.env.INSTAGRAM_APP_SECRET!
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64url')
  if (expectedSig !== encodedSig) return null
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>
  } catch {
    return null
  }
}
