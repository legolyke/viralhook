import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createReelContainer, getContainerStatus, publishReel } from '@/lib/instagram'

export const maxDuration = 60

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: clipId } = await params
  const { caption } = await request.json() as { caption: string }

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
    .select('access_token, channel_id')
    .eq('user_id', user.id)
    .eq('platform', 'instagram')
    .single()

  if (!connection) {
    return NextResponse.json({ error: 'Instagram not connected' }, { status: 400 })
  }

  const { access_token: accessToken, channel_id: userId } = connection

  // Use direct R2 URL — Instagram downloads the video directly, no proxy needed
  const videoUrl = clip.file_url

  try {
    const containerId = await createReelContainer(accessToken, userId as string, videoUrl, caption)

    // Poll up to 50 seconds for the container to finish processing
    const deadline = Date.now() + 50_000
    let status = await getContainerStatus(accessToken, containerId)
    while (status === 'IN_PROGRESS' && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 5000))
      status = await getContainerStatus(accessToken, containerId)
    }

    if (status === 'ERROR' || status === 'EXPIRED') {
      return NextResponse.json({ error: `Instagram container ${status.toLowerCase()}` }, { status: 500 })
    }
    if (status !== 'FINISHED') {
      return NextResponse.json({ error: 'Instagram is still processing the video. Please try again in a minute.' }, { status: 503 })
    }

    const mediaId = await publishReel(accessToken, userId as string, containerId)

    // Non-fatal — log only
    supabase.from('social_posts').insert({
      clip_id: clipId,
      user_id: user.id,
      platform: 'instagram',
      platform_post_id: mediaId,
      status: 'posted',
    }).then(({ error }) => { if (error) console.error('[instagram] social_posts insert:', error.message) })

    return NextResponse.json({ ok: true, mediaId })
  } catch (err) {
    console.error('[instagram] post error:', err instanceof Error ? err.message : err)
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Instagram post failed',
    }, { status: 500 })
  }
}
