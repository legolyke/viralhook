import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startTranscription } from '@/lib/assemblyai'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId, fileSize, durationSeconds } = await request.json() as {
    projectId: string
    fileSize: number
    durationSeconds: number
  }

  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('file_url')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !project?.file_url) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('projects')
    .update({
      status: 'processing',
      file_size: fileSize,
      duration_seconds: Math.round(durationSeconds),
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to confirm upload' }, { status: 500 })
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
  const webhookUrl = `${origin}/api/transcribe/webhook`

  try {
    const jobId = await startTranscription(project.file_url, webhookUrl)
    await supabase
      .from('projects')
      .update({
        status: 'transcribing',
        transcript_job_id: jobId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
  } catch (err) {
    console.error('Failed to start transcription:', err)
  }

  return NextResponse.json({ success: true })
}
