import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTranscript } from '@/lib/assemblyai'
import { detectViralClips } from '@/lib/openai'

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
    .select('id, user_id, status, transcript_job_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (!project.transcript_job_id) return NextResponse.json({ error: 'No transcription job found' }, { status: 400 })

  let transcript
  try {
    transcript = await getTranscript(project.transcript_job_id)
  } catch (err) {
    return NextResponse.json({ error: `Failed to fetch transcript: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 })
  }

  if (transcript.status === 'processing' || transcript.status === 'queued') {
    return NextResponse.json({ status: transcript.status, message: 'Still processing, try again in a moment.' })
  }

  if (transcript.status === 'error') {
    await supabase.from('projects').update({ status: 'error', updated_at: new Date().toISOString() }).eq('id', project.id)
    return NextResponse.json({ status: 'error', message: 'Transcription failed on AssemblyAI side.' })
  }

  if (transcript.status === 'completed') {
    const { error: insertError } = await supabase.from('transcripts').insert({
      project_id: project.id,
      user_id: user.id,
      full_text: transcript.text,
      content: { words: transcript.words ?? [], auto_highlights: transcript.auto_highlights_result?.results ?? [] },
      language: transcript.language_code ?? 'en',
    })
    if (insertError && !insertError.message.includes('duplicate')) {
      return NextResponse.json({ error: `Failed to save transcript: ${insertError.message}` }, { status: 500 })
    }

    // Detect viral clips (non-fatal)
    try {
      const words = transcript.words ?? []
      const highlights = transcript.auto_highlights_result?.results ?? []
      if (words.length > 0) {
        const clips = await detectViralClips(words, highlights, transcript.text ?? '')
        if (clips.length > 0) {
          const { error: clipsErr } = await supabase.from('clips').insert(
            clips.map((clip) => ({
              project_id: project.id,
              user_id: user.id,
              start_ms: Math.round(clip.start_ms),
              end_ms: Math.round(clip.end_ms),
              title: clip.title,
              score: clip.score,
              status: 'detected',
            }))
          )
          if (clipsErr) console.error('Failed to insert clips:', clipsErr)
        }
      }
    } catch (err) {
      console.error('Failed to detect viral clips:', err)
    }

    await supabase.from('projects').update({ status: 'ready', updated_at: new Date().toISOString() }).eq('id', project.id)
    return NextResponse.json({ status: 'ready', message: 'Transcript recovered successfully.' })
  }

  return NextResponse.json({ status: transcript.status })
}
