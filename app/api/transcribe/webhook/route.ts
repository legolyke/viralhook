import { NextResponse } from 'next/server'
import { getTranscript, verifyWebhookSecret } from '@/lib/assemblyai'
import { createServiceClient } from '@/lib/supabase/server'

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
  const supabase = createServiceClient()

  if (status === 'error') {
    await supabase
      .from('projects')
      .update({ status: 'error', updated_at: new Date().toISOString() })
      .eq('transcript_job_id', transcript_id)
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

  await supabase
    .from('projects')
    .update({ status: 'ready', updated_at: new Date().toISOString() })
    .eq('id', project.id)

  return NextResponse.json({ ok: true })
}
