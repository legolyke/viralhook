import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { SUPERADMIN_EMAIL } from '@/lib/is-admin'

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== SUPERADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await params
  const { phone_bypass } = await request.json() as { phone_bypass: boolean }

  const admin = createServiceClient()
  const { error } = await admin
    .from('subscriptions')
    .update({ phone_bypass, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
