import crypto from 'crypto'

// Facebook OAuth for Instagram (API setup with Facebook login)
// Works for app admins without requiring Instagram Tester role
const FB_AUTH_URL = 'https://www.facebook.com/dialog/oauth'
const FB_GRAPH_URL = 'https://graph.facebook.com/v22.0'
const IG_GRAPH_URL = 'https://graph.instagram.com/v22.0'

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/instagram/callback`,
    scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management',
    response_type: 'code',
    state,
  })
  return `${FB_AUTH_URL}?${params}`
}

export async function exchangeCode(code: string): Promise<{
  access_token: string
  user_id: string
}> {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/instagram/callback`,
    code,
  })
  const res = await fetch(`${FB_GRAPH_URL}/oauth/access_token?${params}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Instagram (FB) token exchange failed: ${res.status} ${text}`)
  }
  const data = await res.json() as {
    access_token?: string
    error?: { message: string; code: number }
  }
  if (data.error) throw new Error(`Instagram auth error: ${data.error.message}`)
  if (!data.access_token) throw new Error('Instagram auth: missing access_token')
  return { access_token: data.access_token, user_id: '' }
}

export async function getLongLivedToken(shortToken: string): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: shortToken,
  })
  const res = await fetch(`${FB_GRAPH_URL}/oauth/access_token?${params}`)
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
  // Get Facebook Pages and their linked Instagram business accounts
  const params = new URLSearchParams({
    fields: 'id,name,instagram_business_account{id,username}',
    access_token: accessToken,
  })
  const res = await fetch(`${FB_GRAPH_URL}/me/accounts?${params}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Facebook pages fetch failed: ${res.status} ${text}`)
  }
  const data = await res.json() as {
    data?: Array<{ id: string; name: string; instagram_business_account?: { id: string; username: string } }>
    error?: { message: string; code: number }
  }
  if (data.error) throw new Error(`Facebook pages error: ${data.error.message} (${data.error.code})`)
  const page = data.data?.find(p => p.instagram_business_account)
  const igAccount = page?.instagram_business_account
  if (!igAccount) throw new Error('No Instagram business account linked to your Facebook Page. Make sure your Instagram account is connected to a Facebook Page.')
  return { userId: igAccount.id, username: igAccount.username }
}

export async function createReelContainer(
  accessToken: string,
  userId: string,
  videoUrl: string,
  caption: string
): Promise<string> {
  const res = await fetch(`${IG_GRAPH_URL}/${userId}/media`, {
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
  const res = await fetch(`${IG_GRAPH_URL}/${containerId}?${params}`)
  if (!res.ok) throw new Error(`Instagram container status failed: ${res.status}`)
  const data = await res.json() as { status_code?: string }
  return (data.status_code ?? 'IN_PROGRESS') as 'IN_PROGRESS' | 'FINISHED' | 'ERROR' | 'EXPIRED' | 'PUBLISHED'
}

export async function publishReel(
  accessToken: string,
  userId: string,
  containerId: string
): Promise<string> {
  const res = await fetch(`${IG_GRAPH_URL}/${userId}/media_publish`, {
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
  const secret = process.env.META_APP_SECRET!
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
