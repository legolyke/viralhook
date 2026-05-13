import { NextResponse } from 'next/server'
import { getTranscript, verifyWebhookSecret } from '@/lib/assemblyai'
import { createServiceClient } from '@/lib/supabase/server'
import { detectViralClips } from '@/lib/openai'

interface WebhookPayload {
  transcript_id: string
  status: 'completed' | 'error'
}

export async function POST(request: Request) {
  const secret = request.headers.get('x-assemblyai-secret')
  if (!verifyWebhookSecret(secret, process.env.ASSEMBLYAI_WEBHOOK_SECRET!)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: WebhookPayload
  try {
    payload = await request.json() as WebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { transcript_id, status } = payload
  if (typeof transcript_id !== 'string' || !transcript_id.trim()) {
    return NextResponse.json({ error: 'Invalid transcript_id' }, { status: 400 })
  }
  const supabase = createServiceClient()

  if (status === 'error') {
    const { error: updateErr } = await supabase
      .from('projects')
      .update({ status: 'error', updated_at: new Date().toISOString() })
      .eq('transcript_job_id', transcript_id)
    if (updateErr) console.error('Failed to set project error status:', updateErr)
    return NextResponse.json({ ok: true })
  }

  if (status !== 'completed') {
    return NextResponse.json({ ok: true })
  }

  let transcript
  try {
    transcript = await getTranscript(transcript_id)
  } catch (err) {
    console.error('Failed to fetch transcript from AssemblyAI:', err)
    return NextResponse.json({ error: 'Failed to fetch transcript' }, { status: 500 })
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, user_id')
    .eq('transcript_job_id', transcript_id)
    .single()

  if (!project) {
    console.error('No project found for transcript_job_id:', transcript_id)
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const { error: insertError } = await supabase.from('transcripts').insert({
    project_id: project.id,
    user_id: project.user_id,
    full_text: transcript.text,
    content: {
      words: transcript.words ?? [],
      auto_highlights: transcript.auto_highlights_result?.results ?? [],
    },
    language: transcript.language_code ?? 'en',
  })

  if (insertError) {
    console.error('Failed to save transcript:', insertError)
    return NextResponse.json({ error: 'Failed to save transcript' }, { status: 500 })
  }

  // Detect viral clips (non-fatal — project still becomes ready if this fails)
  try {
    const words = transcript.words ?? []
    const highlights = transcript.auto_highlights_result?.results ?? []
    if (words.length > 0) {
      const clips = await detectViralClips(words, highlights, transcript.text ?? '')
      if (clips.length > 0) {
        const { error: clipsErr } = await supabase.from('clips').insert(
          clips.map((clip) => ({
            project_id: project.id,
            user_id: project.user_id,
            start_time: Math.round(clip.start_ms),
            end_time: Math.round(clip.end_ms),
            title: clip.title,
            virality_score: clip.score,
            status: 'detected',
          }))
        )
        if (clipsErr) console.error('Failed to insert clips:', clipsErr)
      }
    }
  } catch (err) {
    console.error('Failed to detect viral clips:', err)
  }

  const { error: readyErr } = await supabase
    .from('projects')
    .update({ status: 'ready', updated_at: new Date().toISOString() })
    .eq('id', project.id)

  if (readyErr) {
    console.error('Failed to set project ready status:', readyErr)
    return NextResponse.json({ error: 'Failed to update project status' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
