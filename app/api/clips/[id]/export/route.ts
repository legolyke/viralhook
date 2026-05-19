import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getR2KeyFromUrl } from '@/lib/r2'
import { buildSubtitleBlocks } from '@/lib/subtitles'
import type { AssemblyAIWord } from '@/lib/assemblyai'
import type { SubtitleStyle } from '@/lib/subtitles'
import { isAtLimit, getPlanLimit, type PlanName } from '@/lib/plans'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Plan limit check + phone bypass check
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, exports_used, phone_bypass')
    .eq('user_id', user.id)
    .single()

  if (!user.phone_confirmed_at && !sub?.phone_bypass) {
    return NextResponse.json({ error: 'phone_required' }, { status: 403 })
  }

  const plan = (sub?.plan ?? 'free') as PlanName
  const exportsUsed = sub?.exports_used ?? 0

  if (isAtLimit(plan, exportsUsed)) {
    return NextResponse.json({
      error: 'limit_reached',
      plan,
      exports_used: exportsUsed,
      limit: getPlanLimit(plan),
    }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const b = body as Record<string, unknown>

  const cropX = b?.crop_x
  if (typeof cropX !== 'number' || cropX < 0 || cropX > 1) {
    return NextResponse.json({ error: 'crop_x must be a number between 0 and 1' }, { status: 400 })
  }

  const subtitleStyleRaw = b?.subtitle_style as (Partial<SubtitleStyle> & { enabled?: boolean; animated?: boolean; box?: boolean; shadow?: boolean }) | null | undefined
  const subtitleEnabled = subtitleStyleRaw?.enabled === true

  const resolutionRaw = b?.resolution
  const resolution = resolutionRaw === '720p' ? '720p' : '1080p'

  const { id } = await params

  const { data: clip } = await supabase
    .from('clips')
    .select('id, project_id, user_id, start_time, end_time')
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

  let sourceKey: string
  try {
    sourceKey = getR2KeyFromUrl(project.file_url)
  } catch {
    return NextResponse.json({ error: 'Invalid source video URL' }, { status: 500 })
  }

  // Build subtitle data if requested (sent as JSON blocks, not ASS)
  let subtitleData: {
    blocks: { start: number; end: number; text: string }[]
    font_size: number
    color: string
    position: string
    font: string
    box: boolean
    shadow: boolean
  } | null = null

  if (subtitleEnabled && subtitleStyleRaw) {
    // Use service client to bypass RLS on transcripts table
    const svc = createServiceClient()
    const { data: transcript, error: tErr } = await svc
      .from('transcripts')
      .select('content')
      .eq('project_id', clip.project_id)
      .single()

    const words = (transcript?.content as { words?: AssemblyAIWord[] } | null)?.words ?? []
    console.log(`[export] subtitle: transcript=${transcript ? 'found' : 'null'} err=${tErr?.message ?? 'none'} words=${words.length} clip=${clip.start_time}-${clip.end_time}ms`)

    const animated = subtitleStyleRaw.animated === true
    const wordsPerBlock = animated ? 1 : 3
    const blocks = buildSubtitleBlocks(words, clip.start_time, clip.end_time, wordsPerBlock)
    console.log(`[export] subtitle blocks generated: ${blocks.length} (animated=${animated})`)

    if (blocks.length > 0) {
      subtitleData = {
        blocks: blocks.map(b => ({ start: b.start, end: b.end, text: b.text })),
        font_size: typeof subtitleStyleRaw.font_size === 'number' ? subtitleStyleRaw.font_size : 40,
        color: subtitleStyleRaw.color ?? '#FFFFFF',
        position: subtitleStyleRaw.position ?? 'bottom',
        font: (subtitleStyleRaw.font as string | undefined) ?? 'arial',
        box: subtitleStyleRaw.box === true,
        shadow: subtitleStyleRaw.shadow === true,
      }
    } else {
      console.warn('[export] no subtitle blocks — subtitles will be skipped')
    }
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
        subtitle_data: subtitleData,
        resolution,
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

  // Increment export counter
  const svcCounter = createServiceClient()
  await svcCounter
    .from('subscriptions')
    .update({ exports_used: exportsUsed + 1, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
