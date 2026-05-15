import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import type { PlanName } from '@/lib/plans'
import type Stripe from 'stripe'

interface PriceMap {
  price_creator: string
  price_pro: string
  price_agency: string
}

export function resolveWebhookPlan(priceId: string, prices: PriceMap): PlanName | null {
  if (priceId === prices.price_creator) return 'creator'
  if (priceId === prices.price_pro) return 'pro'
  if (priceId === prices.price_agency) return 'agency'
  return null
}

async function updateSubscription(userId: string, plan: PlanName, stripeSubId: string) {
  const svc = createServiceClient()
  await svc
    .from('subscriptions')
    .update({
      plan,
      stripe_subscription_id: stripeSubId,
      exports_used: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
}

async function cancelSubscription(customerId: string) {
  const svc = createServiceClient()
  await svc
    .from('subscriptions')
    .update({
      plan: 'free',
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)
}

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const prices: PriceMap = {
    price_creator: process.env.STRIPE_PRICE_CREATOR ?? '',
    price_pro: process.env.STRIPE_PRICE_PRO ?? '',
    price_agency: process.env.STRIPE_PRICE_AGENCY ?? '',
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      const plan = session.metadata?.plan as PlanName | undefined
      const subId = session.subscription as string | null

      if (userId && plan && subId) {
        await updateSubscription(userId, plan, subId)
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription
      const priceId = sub.items.data[0]?.price.id
      const plan = priceId ? resolveWebhookPlan(priceId, prices) : null
      const customerId = sub.customer as string

      if (plan) {
        const svc = createServiceClient()
        await svc
          .from('subscriptions')
          .update({ plan, stripe_subscription_id: sub.id, updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId)
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      await cancelSubscription(sub.customer as string)
    }
  } catch (err) {
    console.error('[webhook] handler error', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
