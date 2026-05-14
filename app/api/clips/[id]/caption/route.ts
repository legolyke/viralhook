import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateCaption, type CaptionPlatform } from '@/lib/openai'
import type { AssemblyAIWord } from '@/lib/assemblyai'

const VALID_PLATFORMS: CaptionPlatform[] = ['tiktok', 'reels', 'shorts', 'youtube']

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

  const b = body as Record<string, unknown>
  const platform = b?.platform as CaptionPlatform
  if (!VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }

  const { id } = await params

  const { data: clip } = await supabase
    .from('clips')
    .select('id, project_id, start_time, end_time')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

  const svc = createServiceClient()
  const { data: transcript } = await svc
    .from('transcripts')
    .select('content, language')
    .eq('project_id', clip.project_id)
    .single()

  const words = (transcript?.content as { words?: AssemblyAIWord[] } | null)?.words ?? []
  const clipText = words
    .filter(w => w.start >= clip.start_time && w.end <= clip.end_time)
    .map(w => w.text)
    .join(' ')

  if (!clipText.trim()) {
    return NextResponse.json({ error: 'No transcript available for this clip' }, { status: 400 })
  }

  try {
    const caption = await generateCaption(clipText, platform, transcript?.language ?? 'en')
    return NextResponse.json({ caption })
  } catch (err) {
    console.error('[caption] generation failed:', err)
    return NextResponse.json({ error: 'Caption generation failed' }, { status: 500 })
  }
}
