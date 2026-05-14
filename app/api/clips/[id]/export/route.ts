import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getR2KeyFromUrl } from '@/lib/r2'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const cropX = (body as Record<string, unknown>)?.crop_x
  if (typeof cropX !== 'number' || cropX < 0 || cropX > 1) {
    return NextResponse.json({ error: 'crop_x must be a number between 0 and 1' }, { status: 400 })
  }

  const { id } = await params

  const { data: clip } = await supabase
    .from('clips')
    .select('id, project_id, user_id, start_time, end_time, status, updated_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

  if (clip.status === 'processing') {
    const stuckMs = Date.now() - new Date(clip.updated_at).getTime()
    if (stuckMs < 10 * 60 * 1000) {
      return NextResponse.json({ error: 'Export already in progress' }, { status: 409 })
    }
    // Stuck for 10+ minutes — allow retry
  }

  const { data: project } = await supabase
    .from('projects')
    .select('file_url')
    .eq('id', clip.project_id)
    .single()

  if (!project?.file_url) {
    return NextResponse.json({ error: 'Source video not found' }, { status: 404 })
  }

  await supabase
    .from('clips')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', id)

  let sourceKey: string
  try {
    sourceKey = getR2KeyFromUrl(project.file_url)
  } catch {
    return NextResponse.json({ error: 'Invalid source video URL' }, { status: 500 })
  }

  if (!process.env.WORKER_URL || !process.env.WORKER_SECRET) {
    console.error('[export] WORKER_URL or WORKER_SECRET not configured')
    await supabase
      .from('clips')
      .update({ status: 'error', updated_at: new Date().toISOString() })
      .eq('id', id)
    return NextResponse.json({ error: 'Service not configured' }, { status: 503 })
  }

  let workerRes: Response
  try {
    workerRes = await fetch(process.env.WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WORKER_SECRET}`,
      },
      body: JSON.stringify({
        clip_id: id,
        source_key: sourceKey,
        start_time: clip.start_time,
        end_time: clip.end_time,
        crop_x: cropX,
      }),
    })
  } catch (err) {
    console.error('[export] Worker unreachable', err)
    await supabase
      .from('clips')
      .update({ status: 'error', updated_at: new Date().toISOString() })
      .eq('id', id)
    return NextResponse.json({ error: 'Worker unreachable' }, { status: 500 })
  }

  if (!workerRes.ok) {
    console.error('[export] Worker returned', workerRes.status, 'for clip', id)
    await supabase
      .from('clips')
      .update({ status: 'error', updated_at: new Date().toISOString() })
      .eq('id', id)
    return NextResponse.json({ error: 'Worker failed to start' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
