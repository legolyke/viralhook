import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildSubtitleBlocks, blocksToSrt } from '@/lib/subtitles'
import type { AssemblyAIWord } from '@/lib/assemblyai'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: clip } = await supabase
    .from('clips')
    .select('project_id, start_time, end_time')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

  const { data: transcript } = await supabase
    .from('transcripts')
    .select('content')
    .eq('project_id', clip.project_id)
    .single()

  const words = (transcript?.content as { words?: AssemblyAIWord[] } | null)?.words ?? []
  const blocks = buildSubtitleBlocks(words, clip.start_time, clip.end_time)

  if (blocks.length === 0) {
    return NextResponse.json({ error: 'No transcript words found for this clip' }, { status: 404 })
  }

  return new Response(blocksToSrt(blocks), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="clip-${id}.srt"`,
    },
  })
}
