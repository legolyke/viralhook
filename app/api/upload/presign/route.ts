import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePresignedUploadUrl, getPublicUrl } from '@/lib/r2'
import { validateFileFormat, validateDuration } from '@/lib/upload-validator'
import type { Plan } from '@/lib/upload-validator'
import { randomUUID } from 'crypto'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { fileName, fileType, durationSeconds, title } = body as {
    fileName: string
    fileType: string
    durationSeconds: number
    title: string
  }

  // All users are on FREE plan until Module 11 (Stripe subscriptions)
  const plan: Plan = 'free'

  const formatCheck = validateFileFormat(fileName)
  if (!formatCheck.valid) {
    return NextResponse.json({ error: formatCheck.error }, { status: 400 })
  }

  const durationCheck = validateDuration(durationSeconds, plan)
  if (!durationCheck.valid) {
    return NextResponse.json({ error: durationCheck.error }, { status: 400 })
  }

  const key = `${user.id}/${randomUUID()}/${fileName}`

  let presignedUrl: string
  try {
    presignedUrl = await generatePresignedUploadUrl(key, fileType)
  } catch (r2Error) {
    console.error('[presign] R2 error:', r2Error)
    return NextResponse.json({ error: 'Failed to generate upload URL (R2)' }, { status: 500 })
  }

  const fileUrl = getPublicUrl(key)

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      title: title || fileName,
      status: 'uploading',
      file_url: fileUrl,
      source: 'file',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[presign] Supabase error:', error)
    return NextResponse.json({ error: `DB error: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ presignedUrl, projectId: project.id })
}
