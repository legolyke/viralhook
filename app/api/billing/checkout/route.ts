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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    return NextResponse.json({ error: 'App URL not configured' }, { status: 500 })
  }

  const svc = createServiceClient()
  const { data: sub } = await svc
    .from('subscriptions')
    .select('stripe_customer_id, stripe_subscription_id')
    .eq('user_id', user.id)
    .single()

  // If user already has an active Stripe subscription, use portal to change plan
  if (sub?.stripe_subscription_id && sub?.stripe_customer_id) {
    let portalSession
    try {
      portalSession = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: `${appUrl}/billing`,
      })
    } catch (err) {
      console.error('[checkout] portal fallback failed', err)
      return NextResponse.json({ error: 'Checkout creation failed' }, { status: 500 })
    }
    return NextResponse.json({ url: portalSession.url })
  }

  let customerId = sub?.stripe_customer_id ?? null

  if (!customerId) {
    let customer
    try {
      customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      })
    } catch (err) {
      console.error('[checkout] stripe.customers.create failed', err)
      return NextResponse.json({ error: 'Payment setup failed' }, { status: 500 })
    }
    customerId = customer.id

    try {
      await svc
        .from('subscriptions')
        .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
    } catch (err) {
      console.error('[checkout] failed to save customer_id', err)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
  }

  let session
  try {
    session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?success=true`,
      cancel_url: `${appUrl}/billing`,
      metadata: { user_id: user.id, plan },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[checkout] stripe.checkout.sessions.create failed', msg)
    return NextResponse.json({ error: `Checkout creation failed: ${msg}` }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
