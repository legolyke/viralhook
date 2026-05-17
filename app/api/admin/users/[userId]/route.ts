import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isAdmin, SUPERADMIN_EMAIL } from '@/lib/is-admin'

export async function DELETE(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await isAdmin(user.id, user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await params

  // Protect superadmin account from deletion
  const admin = createServiceClient()
  const { data: targetUser } = await admin.auth.admin.getUserById(userId)
  if (targetUser?.user?.email === SUPERADMIN_EMAIL) {
    return NextResponse.json({ error: 'Cannot delete superadmin account' }, { status: 403 })
  }

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
