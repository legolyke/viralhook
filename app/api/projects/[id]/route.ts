import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteObject, getR2KeyFromUrl } from '@/lib/r2'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: project } = await supabase
    .from('projects')
    .select('id, file_url, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (project.file_url) {
    try {
      const key = getR2KeyFromUrl(project.file_url)
      await deleteObject(key)
    } catch (err) {
      console.error('[delete] R2 error (non-fatal):', err)
    }
  }

  await supabase.from('projects').delete().eq('id', id).eq('user_id', user.id)

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { title } = body as { title: string }

  if (!title?.trim() || title.trim().length > 100) {
    return NextResponse.json({ error: 'Title must be 1–100 characters' }, { status: 400 })
  }

  const { data: project, error } = await supabase
    .from('projects')
    .update({ title: title.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, title')
    .single()

  if (error || !project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(project)
}
