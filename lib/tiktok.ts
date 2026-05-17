import crypto from 'crypto'

const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/'
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/'
const TIKTOK_USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/'
const TIKTOK_POST_URL = 'https://open.tiktokapis.com/v2/post/publish/video/init/'

export function generateCodeVerifier(): string {
  return crypto.randomBytes(48).toString('base64url').slice(0, 64)
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

export function getAuthUrl(codeChallenge: string): string {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/tiktok/callback`,
    scope: 'user.info.basic,video.publish,video.upload',
    response_type: 'code',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${TIKTOK_AUTH_URL}?${params}`
}

export async function exchangeCode(code: string, codeVerifier: string): Promise<{
  access_token: string
  refresh_token: string
  open_id: string
}> {
  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/tiktok/callback`,
      code_verifier: codeVerifier,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`TikTok token exchange failed: ${res.status} ${text}`)
  }
  const data = await res.json() as {
    access_token?: string
    refresh_token?: string
    open_id?: string
    error?: string
    error_description?: string
  }
  if (!data.access_token) {
    throw new Error(`TikTok auth error: ${data.error_description ?? data.error ?? 'missing access_token'}`)
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? '',
    open_id: data.open_id ?? '',
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) throw new Error(`TikTok token refresh failed: ${res.status}`)
  const data = await res.json() as { access_token?: string }
  if (!data.access_token) throw new Error('TikTok refresh: missing access_token')
  return data.access_token
}

export async function getUserInfo(accessToken: string, openIdFallback: string): Promise<{
  openId: string
  displayName: string
}> {
  const res = await fetch(`${TIKTOK_USER_INFO_URL}?fields=open_id,display_name`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`TikTok user info failed: ${res.status}`)
  const data = await res.json() as {
    data?: { user?: { open_id?: string; display_name?: string } }
    error?: { code: string; message: string }
  }
  if (data.error?.code && data.error.code !== 'ok') {
    throw new Error(`TikTok user info error: ${data.error.message} (${data.error.code})`)
  }
  const user = data.data?.user
  return {
    openId: user?.open_id ?? openIdFallback,
    displayName: user?.display_name ?? 'TikTok User',
  }
}

export type TikTokPrivacy = 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY'

export async function postVideo(
  accessToken: string,
  videoUrl: string,
  title: string,
  privacyLevel: TikTokPrivacy = 'SELF_ONLY'
): Promise<string> {
  const res = await fetch(TIKTOK_POST_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title,
        privacy_level: privacyLevel,
        disable_duet: true,
        disable_comment: true,
        disable_stitch: true,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: videoUrl,
      },
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`TikTok video post failed: ${res.status} ${text}`)
  }
  const data = await res.json() as {
    data?: { publish_id?: string }
    error?: { code: string; message: string }
  }
  if (data.error?.code && data.error.code !== 'ok') {
    throw new Error(`TikTok post error: ${data.error.message} (${data.error.code})`)
  }
  const publishId = data.data?.publish_id
  if (!publishId) throw new Error('TikTok post: missing publish_id')
  return publishId
}
