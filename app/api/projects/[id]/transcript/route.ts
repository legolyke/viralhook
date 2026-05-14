import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params

  let body: { full_text?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.full_text || typeof body.full_text !== 'string') {
    return NextResponse.json({ error: 'full_text required' }, { status: 400 })
  }

  const svc = createServiceClient()
  const { data: transcript } = await svc
    .from('transcripts')
    .select('id, content')
    .eq('project_id', projectId)
    .single()

  if (!transcript) return NextResponse.json({ error: 'Transcript not found' }, { status: 404 })

  // Update words text by index — preserves timestamps, fixes typos
  const oldWords = (transcript.content as { words?: { text: string; start: number; end: number; confidence: number }[] })?.words ?? []
  const newTokens = body.full_text.trim().split(/\s+/)
  const updatedWords = oldWords.map((word, i) => ({
    ...word,
    text: newTokens[i] ?? word.text,
  }))

  const updatedContent = { ...(transcript.content as object), words: updatedWords }

  const { error } = await svc
    .from('transcripts')
    .update({ full_text: body.full_text, content: updatedContent })
    .eq('id', transcript.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
