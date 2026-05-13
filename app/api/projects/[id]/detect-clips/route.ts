import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { detectViralClips } from '@/lib/openai'
import type { AssemblyAIWord, AssemblyAIHighlight } from '@/lib/assemblyai'

interface TranscriptContent {
  words: AssemblyAIWord[]
  auto_highlights: AssemblyAIHighlight[]
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('id, user_id, status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (project.status !== 'ready') {
    return NextResponse.json({ error: 'Project must be ready before re-analyzing' }, { status: 400 })
  }

  const { data: transcriptRow } = await supabase
    .from('transcripts')
    .select('full_text, content')
    .eq('project_id', id)
    .maybeSingle()

  if (!transcriptRow) return NextResponse.json({ error: 'No transcript found for this project' }, { status: 404 })

  const content = transcriptRow.content as TranscriptContent
  const words = content?.words ?? []
  const highlights = content?.auto_highlights ?? []

  if (words.length === 0) {
    return NextResponse.json({ error: 'Transcript has no word timestamps' }, { status: 400 })
  }

  if (!transcriptRow.full_text) {
    return NextResponse.json({ error: 'Transcript text is missing' }, { status: 400 })
  }

  let clips
  try {
    clips = await detectViralClips(words, highlights, transcriptRow.full_text)
  } catch (err) {
    return NextResponse.json(
      { error: `Clip detection failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }

  // Delete existing clips for this project before inserting new ones
  const { error: deleteError } = await supabase.from('clips').delete().eq('project_id', id).eq('user_id', user.id)
  if (deleteError) {
    return NextResponse.json({ error: 'Failed to clear existing clips' }, { status: 500 })
  }

  if (clips.length > 0) {
    const { error: insertError } = await supabase.from('clips').insert(
      clips.map((clip) => ({
        project_id: project.id,
        user_id: user.id,
        start_time: Math.round(clip.start_ms),
        end_time: Math.round(clip.end_ms),
        title: clip.title,
        virality_score: clip.score,
        status: 'detected',
      }))
    )
    if (insertError) {
      return NextResponse.json({ error: `Failed to save clips: ${insertError.message}` }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, count: clips.length })
}
