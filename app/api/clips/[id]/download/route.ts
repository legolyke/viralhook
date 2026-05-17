import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

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
    .select('file_url, title')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!clip?.file_url) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

  const r2Res = await fetch(clip.file_url)
  if (!r2Res.ok) return NextResponse.json({ error: 'File unavailable' }, { status: 502 })

  const filename = `${(clip.title as string | null)?.replace(/[^a-z0-9]/gi, '_') ?? 'clip'}.mp4`

  return new NextResponse(r2Res.body, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': r2Res.headers.get('content-length') ?? '',
    },
  })
}
