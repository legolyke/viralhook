import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'popescu2290@gmail.com'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  let body: { reply?: string; status?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const reply = body.reply?.trim()
  if (!reply || reply.length < 2) return NextResponse.json({ error: 'Reply too short' }, { status: 400 })

  const newStatus = body.status ?? 'closed'

  const service = createServiceClient()
  const { error } = await service
    .from('support_tickets')
    .update({ admin_reply: reply, replied_at: new Date().toISOString(), status: newStatus })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
