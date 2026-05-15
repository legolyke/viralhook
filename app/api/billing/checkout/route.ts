import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { PLAN_PRICES, type PlanName } from '@/lib/plans'

const UPGRADEABLE_PLANS: PlanName[] = ['creator', 'pro', 'agency']

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const plan = (body as Record<string, unknown>)?.plan as PlanName
  if (!UPGRADEABLE_PLANS.includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const priceId = PLAN_PRICES[plan]
  if (!priceId) {
    return NextResponse.json({ error: 'Plan price not configured' }, { status: 500 })
  }

  const svc = createServiceClient()
  const { data: sub } = await svc
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  let customerId = sub?.stripe_customer_id ?? null

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
    await svc
      .from('subscriptions')
      .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://viralhook-chi.vercel.app'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing?success=true`,
    cancel_url: `${appUrl}/billing`,
    metadata: { user_id: user.id, plan },
  })

  return NextResponse.json({ url: session.url })
}
