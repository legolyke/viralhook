import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const service = createServiceClient()
  const { data: clip, error } = await service
    .from('clips')
    .select('status, file_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    console.error('[status] Supabase error:', error.message)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
  if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

  console.log(`[status] clip=${id} status=${clip.status}`)
  return NextResponse.json({ status: clip.status, file_url: clip.file_url ?? null })
}
