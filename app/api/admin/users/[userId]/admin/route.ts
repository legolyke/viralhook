import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { SUPERADMIN_EMAIL } from '@/lib/is-admin'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== SUPERADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await params
  const { grant } = await request.json() as { grant: boolean }
  const service = createServiceClient()

  if (grant) {
    const { data: targetUser } = await service.auth.admin.getUserById(userId)
    if (!targetUser?.user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    const { error } = await service.from('admins').upsert({
      user_id: userId,
      email: targetUser.user.email ?? '',
      granted_by: user.email,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await service.from('admins').delete().eq('user_id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
