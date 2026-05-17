import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { subject?: string; message?: string; category?: string; attachment_url?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const subject = body.subject?.trim()
  const message = body.message?.trim()
  const category = body.category ?? 'question'
  const attachment_url = body.attachment_url?.trim() || null

  if (!subject || subject.length < 3) return NextResponse.json({ error: 'Subject too short' }, { status: 400 })
  if (!message || message.length < 10) return NextResponse.json({ error: 'Message too short' }, { status: 400 })
  if (!['bug', 'question', 'suggestion'].includes(category)) return NextResponse.json({ error: 'Invalid category' }, { status: 400 })

  const { data, error } = await supabase.from('support_tickets').insert({
    user_id: user.id,
    user_email: user.email,
    subject,
    message,
    category,
    status: 'open',
    attachment_url,
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('support_tickets')
    .select('id, subject, category, status, created_at, admin_reply, replied_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ tickets: data ?? [] })
}
