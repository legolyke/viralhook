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
    // If upload failed and we have a refresh token, try refreshing once
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
