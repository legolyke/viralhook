# Module 14 — Auto Posting System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permite userilor să posteze clipuri exportate direct pe YouTube Shorts din ExportModal, cu conectare cont via OAuth Google în Settings.

**Architecture:** Settings page → Connected Accounts (YouTube OAuth). ExportModal starea `done` → secțiune "Post to social media" → PostToYouTubeModal. API routes: OAuth flow + POST upload YouTube. DB: 2 tabele noi (`social_connections`, `social_posts`).

**Tech Stack:** Next.js App Router, Supabase (RLS), YouTube Data API v3, Google OAuth 2.0, vitest

---

## Fișiere create/modificate

| Fișier | Acțiune |
|---|---|
| `lib/youtube.ts` | Creat — getAuthUrl, exchangeCode, refreshAccessToken, getChannelInfo, uploadVideo |
| `tests/lib/youtube.test.ts` | Creat — teste vitest pentru lib/youtube.ts |
| `app/api/social/youtube/auth/route.ts` | Creat — redirect OAuth |
| `app/api/social/youtube/callback/route.ts` | Creat — exchange code, salvare tokens |
| `app/api/social/youtube/disconnect/route.ts` | Creat — ștergere conexiune |
| `app/api/social/youtube/status/route.ts` | Creat — GET status conectare |
| `app/api/clips/[id]/post/youtube/route.ts` | Creat — upload video YouTube |
| `app/(dashboard)/settings/page.tsx` | Modificat — înlocuit Coming Soon cu Connected Accounts |
| `components/settings/ConnectedAccounts.tsx` | Creat — carduri platforme client component |
| `components/project/PostToYouTubeModal.tsx` | Creat — modal titlu/descriere/privacy + post |
| `components/project/ExportModal.tsx` | Modificat — adăugat prop clipTitle + secțiune post în starea done |
| `components/project/ClipsGrid.tsx` | Modificat — pasează clipTitle la ExportModal |

---

### Task 1: Tabele Supabase

**Files:**
- Run SQL manual în Supabase SQL Editor

- [ ] **Step 1: Rulează SQL în Supabase Dashboard → SQL Editor**

```sql
-- Conexiuni conturi sociale
CREATE TABLE social_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  channel_name text,
  channel_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own social connections" ON social_connections
  FOR ALL USING (auth.uid() = user_id);

-- Postări pe platforme sociale
CREATE TABLE social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id uuid REFERENCES clips(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  platform_post_id text,
  status text DEFAULT 'posted',
  posted_at timestamptz DEFAULT now()
);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own social posts" ON social_posts
  FOR ALL USING (auth.uid() = user_id);
```

- [ ] **Step 2: Verifică că tabelele apar în Supabase Dashboard → Table Editor**

---

### Task 2: Google Cloud Console setup

**Files:** Doar env vars

- [ ] **Step 1: Mergi la console.cloud.google.com → New Project → "ViralHook"**

- [ ] **Step 2: Enable YouTube Data API v3**
  - APIs & Services → Enable APIs → caută "YouTube Data API v3" → Enable

- [ ] **Step 3: Creează OAuth 2.0 credentials**
  - APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
  - Application type: Web application
  - Authorized redirect URIs: `https://viralhook-chi.vercel.app/api/social/youtube/callback`
  - Adaugă și `http://localhost:3000/api/social/youtube/callback` pentru dev local

- [ ] **Step 4: Adaugă env vars în Vercel Dashboard**
  ```
  GOOGLE_CLIENT_ID=<client_id_de_la_google>
  GOOGLE_CLIENT_SECRET=<client_secret_de_la_google>
  ```

- [ ] **Step 5: Adaugă în `.env.local` pentru dev local**
  ```
  GOOGLE_CLIENT_ID=<client_id>
  GOOGLE_CLIENT_SECRET=<client_secret>
  ```

---

### Task 3: lib/youtube.ts + teste

**Files:**
- Create: `lib/youtube.ts`
- Create: `tests/lib/youtube.test.ts`

- [ ] **Step 1: Scrie testele întâi**

Creează `tests/lib/youtube.test.ts`:

```typescript
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
```

- [ ] **Step 2: Rulează testele — trebuie să pice**

```
npx vitest run tests/lib/youtube.test.ts
```

Expected: FAIL — `lib/youtube` not found

- [ ] **Step 3: Implementează `lib/youtube.ts`**

```typescript
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
  if (!res.ok) throw new Error('Failed to exchange code')
  const data = await res.json() as { access_token: string; refresh_token: string }
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
  if (!res.ok) throw new Error('Failed to refresh token')
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
    headers: { 'Content-Type': 'video/mp4' },
    body: videoBuffer,
  })
  if (!uploadRes.ok) throw new Error('Failed to upload video to YouTube')
  const uploadData = await uploadRes.json() as { id: string }
  return uploadData.id
}
```

- [ ] **Step 4: Rulează testele — trebuie să treacă**

```
npx vitest run tests/lib/youtube.test.ts
```

Expected: PASS (4 suites, 7 teste)

- [ ] **Step 5: Commit**

```
git add lib/youtube.ts tests/lib/youtube.test.ts
git commit -m "feat(module14): youtube client lib + tests"
```

---

### Task 4: OAuth API routes

**Files:**
- Create: `app/api/social/youtube/auth/route.ts`
- Create: `app/api/social/youtube/callback/route.ts`
- Create: `app/api/social/youtube/disconnect/route.ts`
- Create: `app/api/social/youtube/status/route.ts`

- [ ] **Step 1: Creează `app/api/social/youtube/auth/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/youtube'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.redirect(getAuthUrl())
}
```

- [ ] **Step 2: Creează `app/api/social/youtube/callback/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { exchangeCode, getChannelInfo } from '@/lib/youtube'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (!code) {
    return NextResponse.redirect(`${appUrl}/settings?error=no_code`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${appUrl}/login`)

  try {
    const { access_token, refresh_token } = await exchangeCode(code)
    const { channelId, channelName } = await getChannelInfo(access_token)

    await supabase.from('social_connections').upsert(
      {
        user_id: user.id,
        platform: 'youtube',
        access_token,
        refresh_token,
        channel_id: channelId,
        channel_name: channelName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform' }
    )

    return NextResponse.redirect(`${appUrl}/settings?connected=youtube`)
  } catch {
    return NextResponse.redirect(`${appUrl}/settings?error=youtube_failed`)
  }
}
```

- [ ] **Step 3: Creează `app/api/social/youtube/disconnect/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase
    .from('social_connections')
    .delete()
    .eq('user_id', user.id)
    .eq('platform', 'youtube')

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Creează `app/api/social/youtube/status/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connected: false })

  const { data } = await supabase
    .from('social_connections')
    .select('channel_name, channel_id')
    .eq('user_id', user.id)
    .eq('platform', 'youtube')
    .single()

  if (!data) return NextResponse.json({ connected: false })
  return NextResponse.json({ connected: true, channelName: data.channel_name, channelId: data.channel_id })
}
```

- [ ] **Step 5: Commit**

```
git add app/api/social/
git commit -m "feat(module14): youtube oauth routes (auth, callback, disconnect, status)"
```

---

### Task 5: Post YouTube API route

**Files:**
- Create: `app/api/clips/[id]/post/youtube/route.ts`

- [ ] **Step 1: Creează `app/api/clips/[id]/post/youtube/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { uploadVideo, refreshAccessToken } from '@/lib/youtube'

export const maxDuration = 60

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: clipId } = await params
  const { title, description, privacyStatus } = await request.json() as {
    title: string
    description: string
    privacyStatus: 'public' | 'unlisted' | 'private'
  }

  // Ownership check + get file_url
  const { data: clip } = await supabase
    .from('clips')
    .select('file_url, user_id')
    .eq('id', clipId)
    .single()

  if (!clip || clip.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!clip.file_url) {
    return NextResponse.json({ error: 'Clip not exported yet' }, { status: 400 })
  }

  // Get YouTube connection
  const { data: connection } = await supabase
    .from('social_connections')
    .select('access_token, refresh_token')
    .eq('user_id', user.id)
    .eq('platform', 'youtube')
    .single()

  if (!connection) {
    return NextResponse.json({ error: 'YouTube not connected' }, { status: 400 })
  }

  let accessToken = connection.access_token

  try {
    const videoId = await uploadVideo(accessToken, clip.file_url, title, description, privacyStatus)

    await supabase.from('social_posts').insert({
      clip_id: clipId,
      user_id: user.id,
      platform: 'youtube',
      platform_post_id: videoId,
      status: 'posted',
    })

    return NextResponse.json({
      ok: true,
      videoId,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    })
  } catch (err) {
    // If 401, try refresh token once
    if (connection.refresh_token && err instanceof Error && err.message.includes('upload')) {
      try {
        accessToken = await refreshAccessToken(connection.refresh_token)
        await supabase
          .from('social_connections')
          .update({ access_token: accessToken, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('platform', 'youtube')

        const videoId = await uploadVideo(accessToken, clip.file_url, title, description, privacyStatus)

        await supabase.from('social_posts').insert({
          clip_id: clipId,
          user_id: user.id,
          platform: 'youtube',
          platform_post_id: videoId,
          status: 'posted',
        })

        return NextResponse.json({
          ok: true,
          videoId,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        })
      } catch {
        return NextResponse.json({ error: 'YouTube upload failed after token refresh' }, { status: 500 })
      }
    }

    return NextResponse.json({
      error: err instanceof Error ? err.message : 'YouTube upload failed',
    }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```
git add app/api/clips/
git commit -m "feat(module14): post to youtube API route with token refresh"
```

---

### Task 6: Settings page — Connected Accounts

**Files:**
- Create: `components/settings/ConnectedAccounts.tsx`
- Modify: `app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Creează `components/settings/ConnectedAccounts.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface YouTubeStatus {
  connected: boolean
  channelName?: string
  channelId?: string
}

function PlatformCard({
  name,
  icon,
  connected,
  channelName,
  onConnect,
  onDisconnect,
  comingSoon,
}: {
  name: string
  icon: React.ReactNode
  connected?: boolean
  channelName?: string
  onConnect?: () => void
  onDisconnect?: () => void
  comingSoon?: boolean
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: `1px solid ${connected ? 'rgba(74,222,128,0.3)' : 'rgba(168,85,247,0.15)'}`,
      borderRadius: 12,
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#E9D5FF' }}>{name}</div>
        {connected && channelName && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {channelName}
          </div>
        )}
        {comingSoon && (
          <div style={{ fontSize: 11, color: 'rgba(168,85,247,0.6)', marginTop: 2 }}>API approval pending</div>
        )}
      </div>
      {comingSoon ? (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
          background: 'rgba(168,85,247,0.1)', color: 'rgba(168,85,247,0.6)',
          letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          Coming soon
        </span>
      ) : connected ? (
        <button
          onClick={onDisconnect}
          style={{
            fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8, flexShrink: 0,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#F87171', cursor: 'pointer',
          }}
        >
          Disconnect
        </button>
      ) : (
        <button
          onClick={onConnect}
          style={{
            fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(90deg,#7C3AED,#C026D3)', border: 'none',
            color: '#fff', cursor: 'pointer',
          }}
        >
          Connect
        </button>
      )}
    </div>
  )
}

export default function ConnectedAccounts() {
  const searchParams = useSearchParams()
  const [youtube, setYoutube] = useState<YouTubeStatus>({ connected: false })
  const [banner, setBanner] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/social/youtube/status')
      .then(r => r.json())
      .then((data: YouTubeStatus) => setYoutube(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected === 'youtube') {
      setBanner('YouTube connected successfully!')
      fetch('/api/social/youtube/status')
        .then(r => r.json())
        .then((data: YouTubeStatus) => setYoutube(data))
        .catch(() => {})
    } else if (error) {
      setBanner('Failed to connect YouTube. Please try again.')
    }
  }, [searchParams])

  async function handleDisconnect() {
    await fetch('/api/social/youtube/disconnect', { method: 'DELETE' })
    setYoutube({ connected: false })
  }

  return (
    <div>
      {banner && (
        <div style={{
          marginBottom: 16, padding: '10px 16px', borderRadius: 8,
          background: banner.includes('success') ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${banner.includes('success') ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: banner.includes('success') ? '#4ADE80' : '#F87171',
          fontSize: 13,
        }}>
          {banner}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PlatformCard
          name="YouTube"
          connected={youtube.connected}
          channelName={youtube.channelName}
          onConnect={() => { window.location.href = '/api/social/youtube/auth' }}
          onDisconnect={() => void handleDisconnect()}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#FF0000">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          }
        />
        <PlatformCard
          name="TikTok"
          comingSoon
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.16 8.16 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z"/>
            </svg>
          }
        />
        <PlatformCard
          name="Instagram"
          comingSoon
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
            </svg>
          }
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Modifică `app/(dashboard)/settings/page.tsx`**

Înlocuiește tot conținutul cu:

```typescript
import PageHeader from '@/components/dashboard/PageHeader'
import ConnectedAccounts from '@/components/settings/ConnectedAccounts'
import { Suspense } from 'react'

export default function SettingsPage() {
  return (
    <div style={{ padding: '28px 28px 40px', maxWidth: 600 }}>
      <PageHeader
        title="Settings"
        breadcrumb="Dashboard / Settings"
        description="Account preferences and connected integrations."
      />

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
          Connected Accounts
        </h2>
        <Suspense fallback={null}>
          <ConnectedAccounts />
        </Suspense>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```
git add components/settings/ app/(dashboard)/settings/page.tsx
git commit -m "feat(module14): settings page with connected accounts (YouTube OAuth)"
```

---

### Task 7: ExportModal + PostToYouTubeModal

**Files:**
- Create: `components/project/PostToYouTubeModal.tsx`
- Modify: `components/project/ExportModal.tsx`
- Modify: `components/project/ClipsGrid.tsx`

- [ ] **Step 1: Creează `components/project/PostToYouTubeModal.tsx`**

```typescript
'use client'

import { useState } from 'react'

interface PostToYouTubeModalProps {
  clipId: string
  defaultTitle: string
  onClose: () => void
}

type PostState = 'idle' | 'posting' | 'done' | 'error'

export default function PostToYouTubeModal({ clipId, defaultTitle, onClose }: PostToYouTubeModalProps) {
  const [title, setTitle] = useState(defaultTitle.slice(0, 100))
  const [description, setDescription] = useState('')
  const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('public')
  const [postState, setPostState] = useState<PostState>('idle')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function handlePost() {
    setPostState('posting')
    try {
      const res = await fetch(`/api/clips/${clipId}/post/youtube`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, privacyStatus: privacy }),
      })
      const data = await res.json() as { ok?: boolean; videoUrl?: string; error?: string }
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? 'Upload failed')
        setPostState('error')
        return
      }
      setVideoUrl(data.videoUrl ?? null)
      setPostState('done')
    } catch {
      setErrorMsg('Network error')
      setPostState('error')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 60, padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: '#0F0F1A', border: '1px solid rgba(168,85,247,0.2)',
        borderRadius: 16, width: '100%', maxWidth: 480, padding: 24,
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#E9D5FF', fontWeight: 700, fontSize: 16, margin: 0 }}>Post to YouTube</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {postState === 'idle' && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Title
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value.slice(0, 100))}
                maxLength={100}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.2)',
                  borderRadius: 8, color: '#E9D5FF', fontSize: 13, outline: 'none',
                }}
              />
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4, textAlign: 'right' }}>{title.length}/100</div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value.slice(0, 5000))}
                rows={4}
                maxLength={5000}
                placeholder="Add a description, hashtags..."
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '10px 12px', resize: 'vertical',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.2)',
                  borderRadius: 8, color: '#E9D5FF', fontSize: 13, outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Privacy
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['public', 'unlisted', 'private'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPrivacy(p)}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      background: privacy === p ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.04)',
                      border: privacy === p ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.1)',
                      color: privacy === p ? '#E9D5FF' : 'rgba(255,255,255,0.4)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => void handlePost()}
              style={{
                width: '100%', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #7C3AED, #C026D3)',
                color: '#fff', fontWeight: 700, fontSize: 15,
              }}
            >
              Post to YouTube
            </button>
          </>
        )}

        {postState === 'posting' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8 }}>Uploading to YouTube...</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>This may take up to 60 seconds</div>
          </div>
        )}

        {postState === 'done' && (
          <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ color: '#4ADE80', fontSize: 18, fontWeight: 700 }}>Posted! 🎉</div>
            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', padding: '10px 20px', borderRadius: 8,
                  background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
                  color: '#4ADE80', fontWeight: 600, fontSize: 13, textDecoration: 'none',
                }}
              >
                View on YouTube →
              </a>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        )}

        {postState === 'error' && (
          <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ color: '#F87171', fontSize: 14, fontWeight: 600 }}>Upload failed</div>
            {errorMsg && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{errorMsg}</div>}
            <button
              onClick={() => setPostState('idle')}
              style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(168,85,247,0.3)', background: 'transparent', color: '#C084FC', cursor: 'pointer', fontSize: 13 }}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Adaugă prop `clipTitle` în `ExportModal`**

În `components/project/ExportModal.tsx`, modifică interfața `ExportModalProps`:

```typescript
// ÎNAINTE:
interface ExportModalProps {
  clipId: string
  startTime: number
  endTime: number
  projectFileUrl: string
  onClose: () => void
}

// DUPĂ:
interface ExportModalProps {
  clipId: string
  clipTitle: string
  startTime: number
  endTime: number
  projectFileUrl: string
  onClose: () => void
}
```

Modifică semnătura funcției:
```typescript
// ÎNAINTE:
export default function ExportModal({ clipId, startTime, endTime, projectFileUrl, onClose }: ExportModalProps) {

// DUPĂ:
export default function ExportModal({ clipId, clipTitle, startTime, endTime, projectFileUrl, onClose }: ExportModalProps) {
```

- [ ] **Step 3: Adaugă state pentru YouTube modal și status în `ExportModal`**

Adaugă aceste state-uri după celelalte `useState` existente (ex: după `const [subtitleAnimated, setSubtitleAnimated] = useState(false)`):

```typescript
const [showYouTubeModal, setShowYouTubeModal] = useState(false)
const [youtubeConnected, setYoutubeConnected] = useState<boolean | null>(null)
```

Adaugă import în topul fișierului:
```typescript
import PostToYouTubeModal from './PostToYouTubeModal'
```

Adaugă useEffect pentru a verifica dacă YouTube e conectat când starea devine `done`:

```typescript
useEffect(() => {
  if (state !== 'done') return
  fetch('/api/social/youtube/status')
    .then(r => r.json())
    .then((data: { connected: boolean }) => setYoutubeConnected(data.connected))
    .catch(() => setYoutubeConnected(false))
}, [state])
```

- [ ] **Step 4: Adaugă secțiunea "Post to social media" în starea `done`**

În `ExportModal`, găsește blocul `{state === 'done' && (` și adaugă după butonul "Download SRT" și înainte de butonul "Re-generate":

```typescript
{/* Post to social media */}
<div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
    Post to social media
  </p>
  <div style={{ display: 'flex', gap: 8 }}>
    {/* YouTube */}
    <button
      type="button"
      onClick={() => {
        if (youtubeConnected) {
          setShowYouTubeModal(true)
        } else {
          window.open('/settings', '_blank')
        }
      }}
      title={youtubeConnected ? 'Post to YouTube' : 'Connect YouTube in Settings first'}
      style={{
        flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
        background: youtubeConnected ? 'rgba(255,0,0,0.08)' : 'rgba(255,255,255,0.03)',
        border: youtubeConnected ? '1px solid rgba(255,0,0,0.25)' : '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={youtubeConnected ? '#FF0000' : 'rgba(255,255,255,0.2)'}>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
      <span style={{ fontSize: 10, color: youtubeConnected ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)', fontWeight: 600 }}>
        {youtubeConnected ? 'YouTube' : 'Connect'}
      </span>
    </button>

    {/* TikTok — coming soon */}
    <button
      type="button"
      disabled
      title="TikTok API approval pending"
      style={{
        flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'not-allowed',
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: 0.4,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.16 8.16 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z"/>
      </svg>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>TikTok</span>
    </button>

    {/* Instagram — coming soon */}
    <button
      type="button"
      disabled
      title="Instagram API approval pending"
      style={{
        flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'not-allowed',
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: 0.4,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
      </svg>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>Instagram</span>
    </button>
  </div>
</div>
```

- [ ] **Step 5: Adaugă PostToYouTubeModal în return-ul ExportModal**

Înainte de `</div>` final (care închide `overlayStyle`), adaugă după `{upsellData && ...}`:

```typescript
{showYouTubeModal && (
  <PostToYouTubeModal
    clipId={clipId}
    defaultTitle={clipTitle}
    onClose={() => setShowYouTubeModal(false)}
  />
)}
```

- [ ] **Step 6: Pasează `clipTitle` din ClipsGrid**

În `components/project/ClipsGrid.tsx`, găsește `<ExportModal` și adaugă prop-ul `clipTitle`:

```typescript
// ÎNAINTE:
<ExportModal
  clipId={clip.id}
  startTime={clip.start_time}
  endTime={clip.end_time}
  projectFileUrl={projectFileUrl}
  onClose={() => setShowExport(false)}
/>

// DUPĂ:
<ExportModal
  clipId={clip.id}
  clipTitle={clip.title ?? ''}
  startTime={clip.start_time}
  endTime={clip.end_time}
  projectFileUrl={projectFileUrl}
  onClose={() => setShowExport(false)}
/>
```

- [ ] **Step 7: TypeScript check**

```
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 8: Commit**

```
git add components/project/PostToYouTubeModal.tsx components/project/ExportModal.tsx components/project/ClipsGrid.tsx
git commit -m "feat(module14): post to social media UI — ExportModal + PostToYouTubeModal"
```

---

### Task 8: Verificare manuală

- [ ] **Step 1: Rulează toate testele**

```
npx vitest run
```

Expected: toate testele trec

- [ ] **Step 2: Pornește dev server**

```
npm run dev
```

- [ ] **Step 3: Verifică Settings page**
  - Mergi la `/settings`
  - Trebuie să apară 3 carduri: YouTube (buton Connect), TikTok (Coming soon), Instagram (Coming soon)

- [ ] **Step 4: Testează OAuth YouTube**
  - Click "Connect YouTube" → redirect la Google
  - Autentifică-te cu contul Google
  - Trebuie să te întoarcă la `/settings?connected=youtube` cu banner verde
  - Cardul YouTube arată "Connected ✓" cu numele canalului

- [ ] **Step 5: Verifică ExportModal**
  - Mergi la un proiect cu clips exportate
  - Deschide ExportModal → generează un clip → starea `done`
  - Trebuie să apară secțiunea "Post to social media" cu 3 butoane

- [ ] **Step 6: Testează postarea pe YouTube**
  - Click buton YouTube din ExportModal
  - Se deschide PostToYouTubeModal cu titlul pre-completat
  - Setează privacy Unlisted pentru test
  - Click "Post to YouTube"
  - Trebuie să apară "Posted! 🎉" cu link la video

- [ ] **Step 7: Push final**

```
git push origin main
```
