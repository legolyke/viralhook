import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = 'popescu2290@gmail.com'

export async function DELETE(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await params
  const admin = createServiceClient()

  // Delete public table data in FK-safe order
  await admin.from('exports').delete().eq('user_id', userId)
  await admin.from('subtitles').delete().eq('user_id', userId)
  await admin.from('clips').delete().eq('user_id', userId)
  await admin.from('transcripts').delete().eq('user_id', userId)
  await admin.from('projects').delete().eq('user_id', userId)
  await admin.from('subscriptions').delete().eq('user_id', userId)
  await admin.from('social_connections').delete().eq('user_id', userId)

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
