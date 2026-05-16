const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3'
const YOUTUBE_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos'

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/youtube/callback`,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeCode(code: string): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/youtube/callback`,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Failed to exchange code: ${res.status}`)
  const data = await res.json() as { access_token: string; refresh_token: string }
  if (!data.access_token) throw new Error('Failed to exchange code: missing access_token')
  return { access_token: data.access_token, refresh_token: data.refresh_token }
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Failed to refresh token: ${res.status}`)
  const data = await res.json() as { access_token: string }
  return data.access_token
}

export async function getChannelInfo(accessToken: string): Promise<{ channelId: string; channelName: string }> {
  const res = await fetch(`${YOUTUBE_API_URL}/channels?part=snippet&mine=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to get channel info')
  const data = await res.json() as { items?: Array<{ id: string; snippet: { title: string } }> }
  const channel = data.items?.[0]
  if (!channel) throw new Error('No YouTube channel found')
  return { channelId: channel.id, channelName: channel.snippet.title }
}

export async function uploadVideo(
  accessToken: string,
  fileUrl: string,
  title: string,
  description: string,
  privacyStatus: 'public' | 'unlisted' | 'private'
): Promise<string> {
  const videoRes = await fetch(fileUrl)
  if (!videoRes.ok) throw new Error('Failed to fetch video from storage')
  const videoBuffer = await videoRes.arrayBuffer()

  const initRes = await fetch(
    `${YOUTUBE_UPLOAD_URL}?uploadType=resumable&part=snippet,status`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(videoBuffer.byteLength),
      },
      body: JSON.stringify({
        snippet: { title, description, categoryId: '22' },
        status: { privacyStatus },
      }),
    }
  )
  if (!initRes.ok) throw new Error('Failed to initiate YouTube upload')
  const uploadUrl = initRes.headers.get('Location')
  if (!uploadUrl) throw new Error('No upload URL returned from YouTube')

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      Authorization: `Bearer ${accessToken}`,
    },
    body: videoBuffer,
  })
  if (!uploadRes.ok) throw new Error('Failed to upload video to YouTube')
  const uploadData = await uploadRes.json() as { id: string }
  return uploadData.id
}
