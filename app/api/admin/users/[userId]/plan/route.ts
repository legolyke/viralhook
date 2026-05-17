import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { PlanName } from '@/lib/plans'
import { isAdmin } from '@/lib/is-admin'

const VALID_PLANS: PlanName[] = ['free', 'creator', 'pro', 'agency']

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await isAdmin(user.id, user.email))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await params
  const { plan } = await request.json() as { plan: PlanName }

  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { error } = await admin
    .from('subscriptions')
    .update({ plan, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
