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
    .select('id, project_id, user_id, start_time, end_time, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

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

  const sourceKey = getR2KeyFromUrl(project.file_url)

  const workerRes = await fetch(process.env.WORKER_URL!, {
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

  if (!workerRes.ok) {
    await supabase
      .from('clips')
      .update({ status: 'error', updated_at: new Date().toISOString() })
      .eq('id', id)
    return NextResponse.json({ error: 'Worker failed to start' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
