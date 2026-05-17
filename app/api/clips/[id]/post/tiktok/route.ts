import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { postVideo, refreshAccessToken, type TikTokPrivacy } from '@/lib/tiktok'

export const maxDuration = 60

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: clipId } = await params
  const { title, privacyLevel } = await request.json() as {
    title: string
    privacyLevel?: TikTokPrivacy
  }

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

  const { data: connection } = await supabase
    .from('social_connections')
    .select('access_token, refresh_token')
    .eq('user_id', user.id)
    .eq('platform', 'tiktok')
    .single()

  if (!connection) {
    return NextResponse.json({ error: 'TikTok not connected' }, { status: 400 })
  }

  let accessToken = connection.access_token
  // Use proxy URL on viralhook.media so TikTok URL ownership check passes
  const streamUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/clips/${clipId}/stream`
  // Until TikTok approves the app, unaudited apps can only post privately
  const effectivePrivacy: TikTokPrivacy = 'SELF_ONLY'

  try {
    const publishId = await postVideo(accessToken, streamUrl, title, effectivePrivacy)

    await supabase.from('social_posts').insert({
      clip_id: clipId,
      user_id: user.id,
      platform: 'tiktok',
      platform_post_id: publishId,
      status: 'posted',
    })

    return NextResponse.json({ ok: true, publishId })
  } catch (err) {
    if (connection.refresh_token) {
      try {
        accessToken = await refreshAccessToken(connection.refresh_token)
        await supabase
          .from('social_connections')
          .update({ access_token: accessToken, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('platform', 'tiktok')

        const publishId = await postVideo(accessToken, streamUrl, title, effectivePrivacy)

        await supabase.from('social_posts').insert({
          clip_id: clipId,
          user_id: user.id,
          platform: 'tiktok',
          platform_post_id: publishId,
          status: 'posted',
        })

        return NextResponse.json({ ok: true, publishId })
      } catch (retryErr) {
        return NextResponse.json({ error: retryErr instanceof Error ? retryErr.message : 'TikTok post failed after token refresh' }, { status: 500 })
      }
    }

    return NextResponse.json({
      error: err instanceof Error ? err.message : 'TikTok post failed',
    }, { status: 500 })
  }
}
