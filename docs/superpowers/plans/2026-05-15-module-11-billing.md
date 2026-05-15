# Module 11 — Stripe Billing & Phone Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Stripe subscription billing (Free/Creator/Pro/Agency plans) with export limit enforcement and SMS phone verification to prevent free-tier abuse.

**Architecture:** Supabase `subscriptions` table is the source of truth for plan/usage. Stripe webhooks update it on payment events. Export route checks phone verification + plan limits server-side before dispatching to Railway. UI shows upsell modal at limit and phone verify modal at first export.

**Tech Stack:** Next.js 16 App Router, Supabase (auth + DB), Stripe Node SDK, Vitest

---

## File Map

**Created:**
- `lib/plans.ts` — plan constants, limits, Subscription type
- `lib/stripe.ts` — Stripe singleton client
- `app/api/billing/checkout/route.ts` — create Stripe Checkout session
- `app/api/billing/portal/route.ts` — create Stripe Customer Portal session
- `app/api/billing/webhook/route.ts` — handle Stripe webhook events
- `app/api/user/phone/route.ts` — send + verify SMS OTP
- `components/billing/PricingCards.tsx` — plan cards with upgrade buttons
- `components/billing/UpsellModal.tsx` — popup when export limit reached
- `components/phone/PhoneVerifyModal.tsx` — phone OTP verification popup
- `tests/lib/plans.test.ts` — unit tests for plan helpers
- `tests/api/billing/webhook.test.ts` — unit tests for webhook handler logic

**Modified:**
- `app/api/clips/[id]/export/route.ts` — add phone + limit checks
- `app/(dashboard)/layout.tsx` — fetch and pass subscription plan
- `components/dashboard/Sidebar.tsx` — show plan badge + upgrade link
- `app/(dashboard)/billing/page.tsx` — replace placeholder with real UI

---

## Task 1: Install Stripe SDK

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install stripe**

```bash
cd /d/CLAUDE/proiecte/viralhook
npm install stripe
```

Expected output: `added 1 package` (stripe ~14.x)

- [ ] **Step 2: Verify install**

```bash
node -e "require('stripe'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install stripe SDK"
```

---

## Task 2: Supabase — subscriptions table + trigger + cron

**Files:**
- No code files — SQL run in Supabase SQL Editor

- [ ] **Step 1: Run SQL in Supabase Dashboard → SQL Editor**

```sql
-- 1. subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','creator','pro','agency')),
  stripe_customer_id text,
  stripe_subscription_id text,
  exports_used int NOT NULL DEFAULT 0,
  period_start date NOT NULL DEFAULT date_trunc('month', now())::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- 2. Auto-create subscription row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Create subscription row for existing users (run once)
INSERT INTO public.subscriptions (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
```

- [ ] **Step 2: Enable pg_cron extension (Supabase Dashboard → Database → Extensions → search "cron" → enable)**

- [ ] **Step 3: Run cron schedule in SQL Editor**

```sql
SELECT cron.schedule(
  'reset-monthly-exports',
  '0 0 1 * *',
  $$UPDATE public.subscriptions
    SET exports_used = 0,
        period_start = date_trunc('month', now())::date,
        updated_at = now()$$
);
```

- [ ] **Step 4: Verify table exists**

In SQL Editor run:
```sql
SELECT * FROM public.subscriptions LIMIT 5;
```
Expected: rows for existing users with `plan='free'`, `exports_used=0`

---

## Task 3: `lib/plans.ts` — plan constants

**Files:**
- Create: `lib/plans.ts`
- Create: `tests/lib/plans.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/plans.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { PLAN_LIMITS, getPlanLimit, isAtLimit, type PlanName } from '@/lib/plans'

describe('PLAN_LIMITS', () => {
  it('has correct limits for all plans', () => {
    expect(PLAN_LIMITS.free).toBe(3)
    expect(PLAN_LIMITS.creator).toBe(40)
    expect(PLAN_LIMITS.pro).toBe(150)
    expect(PLAN_LIMITS.agency).toBe(2000)
  })
})

describe('getPlanLimit', () => {
  it('returns limit for known plan', () => {
    expect(getPlanLimit('free')).toBe(3)
    expect(getPlanLimit('agency')).toBe(2000)
  })

  it('returns free limit for unknown plan', () => {
    expect(getPlanLimit('unknown' as PlanName)).toBe(3)
  })
})

describe('isAtLimit', () => {
  it('returns true when exports_used equals limit', () => {
    expect(isAtLimit('free', 3)).toBe(true)
  })

  it('returns true when exports_used exceeds limit', () => {
    expect(isAtLimit('free', 5)).toBe(true)
  })

  it('returns false when below limit', () => {
    expect(isAtLimit('free', 2)).toBe(false)
    expect(isAtLimit('pro', 149)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /d/CLAUDE/proiecte/viralhook
npx vitest run tests/lib/plans.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/plans'"

- [ ] **Step 3: Create `lib/plans.ts`**

```typescript
export type PlanName = 'free' | 'creator' | 'pro' | 'agency'

export interface Subscription {
  id: string
  user_id: string
  plan: PlanName
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  exports_used: number
  period_start: string
  created_at: string
  updated_at: string
}

export const PLAN_LIMITS: Record<PlanName, number> = {
  free: 3,
  creator: 40,
  pro: 150,
  agency: 2000,
}

export const PLAN_LABELS: Record<PlanName, string> = {
  free: 'FREE',
  creator: 'CREATOR',
  pro: 'PRO',
  agency: 'AGENCY',
}

export const PLAN_PRICES: Record<string, string> = {
  creator: process.env.STRIPE_PRICE_CREATOR ?? '',
  pro: process.env.STRIPE_PRICE_PRO ?? '',
  agency: process.env.STRIPE_PRICE_AGENCY ?? '',
}

export function getPlanLimit(plan: PlanName): number {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
}

export function isAtLimit(plan: PlanName, exportsUsed: number): boolean {
  return exportsUsed >= getPlanLimit(plan)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/lib/plans.test.ts
```

Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
git add lib/plans.ts tests/lib/plans.test.ts
git commit -m "feat: plan constants and limit helpers"
```

---

## Task 4: `lib/stripe.ts` — Stripe client

**Files:**
- Create: `lib/stripe.ts`

- [ ] **Step 1: Create `lib/stripe.ts`**

```typescript
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil',
})
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to lib/stripe.ts

- [ ] **Step 3: Commit**

```bash
git add lib/stripe.ts
git commit -m "feat: Stripe client singleton"
```

---

## Task 5: Stripe Dashboard — manual setup

**Files:** none (manual configuration)

- [ ] **Step 1: Add env vars to `.env.local`**

Add these lines (values from Stripe Dashboard):
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_CREATOR=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_AGENCY=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

- [ ] **Step 2: Create products in Stripe Dashboard → Products → Add product**

Create 3 products:
- Name: "ViralHook Creator" → Price: €19.00 / month (recurring) → copy Price ID → set as STRIPE_PRICE_CREATOR
- Name: "ViralHook Pro" → Price: €49.00 / month (recurring) → copy Price ID → set as STRIPE_PRICE_PRO
- Name: "ViralHook Agency" → Price: €149.00 / month (recurring) → copy Price ID → set as STRIPE_PRICE_AGENCY

- [ ] **Step 3: Add env vars to Vercel**

In Vercel Dashboard → Project → Settings → Environment Variables, add all 6 variables above (use live keys for production).

- [ ] **Step 4: Configure Stripe webhook**

In Stripe Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://viralhook-chi.vercel.app/api/billing/webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Copy Signing Secret → set as `STRIPE_WEBHOOK_SECRET` in Vercel

---

## Task 6: `app/api/billing/checkout/route.ts`

**Files:**
- Create: `app/api/billing/checkout/route.ts`

- [ ] **Step 1: Create the route**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/api/billing/checkout/route.ts
git commit -m "feat: Stripe Checkout session route"
```

---

## Task 7: `app/api/billing/portal/route.ts`

**Files:**
- Create: `app/api/billing/portal/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = createServiceClient()
  const { data: sub } = await svc
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://viralhook-chi.vercel.app'

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${appUrl}/billing`,
  })

  return NextResponse.json({ url: session.url })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/billing/portal/route.ts
git commit -m "feat: Stripe Customer Portal route"
```

---

## Task 8: `app/api/billing/webhook/route.ts`

**Files:**
- Create: `app/api/billing/webhook/route.ts`
- Create: `tests/api/billing/webhook.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/api/billing/webhook.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { resolveWebhookPlan } from '@/app/api/billing/webhook/route'

describe('resolveWebhookPlan', () => {
  it('returns creator for creator price id', () => {
    expect(resolveWebhookPlan('price_creator_123', {
      price_creator: 'price_creator_123',
      price_pro: 'price_pro_456',
      price_agency: 'price_agency_789',
    })).toBe('creator')
  })

  it('returns pro for pro price id', () => {
    expect(resolveWebhookPlan('price_pro_456', {
      price_creator: 'price_creator_123',
      price_pro: 'price_pro_456',
      price_agency: 'price_agency_789',
    })).toBe('pro')
  })

  it('returns agency for agency price id', () => {
    expect(resolveWebhookPlan('price_agency_789', {
      price_creator: 'price_creator_123',
      price_pro: 'price_pro_456',
      price_agency: 'price_agency_789',
    })).toBe('agency')
  })

  it('returns null for unknown price id', () => {
    expect(resolveWebhookPlan('price_unknown', {
      price_creator: 'price_creator_123',
      price_pro: 'price_pro_456',
      price_agency: 'price_agency_789',
    })).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/api/billing/webhook.test.ts
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Create `app/api/billing/webhook/route.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/api/billing/webhook.test.ts
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add app/api/billing/webhook/route.ts tests/api/billing/webhook.test.ts
git commit -m "feat: Stripe webhook handler with plan resolution"
```

---

## Task 9: `app/api/user/phone/route.ts` — SMS OTP

**Files:**
- Create: `app/api/user/phone/route.ts`

- [ ] **Step 1: Enable phone auth in Supabase Dashboard**

Supabase Dashboard → Authentication → Providers → Phone:
- Enable Phone provider: ON
- SMS Provider: Twilio
- Enter: Account SID, Auth Token, From phone number
- Save

- [ ] **Step 2: Create `app/api/user/phone/route.ts`**

```typescript
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function toE164(phone: string, dialCode: string): string {
  const digits = phone.replace(/\D/g, '')
  const code = dialCode.replace(/\D/g, '')
  return `+${code}${digits}`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { phone, dial_code } = body as Record<string, unknown>
  if (typeof phone !== 'string' || typeof dial_code !== 'string') {
    return NextResponse.json({ error: 'phone and dial_code required' }, { status: 400 })
  }

  const e164 = toE164(phone, dial_code)
  if (!/^\+\d{7,15}$/.test(e164)) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  }

  // Check uniqueness — phone already used by another user
  const svc = createServiceClient()
  const { data: existing } = await svc.auth.admin.listUsers()
  const taken = existing?.users?.some(
    u => u.phone === e164 && u.id !== user.id
  )
  if (taken) {
    return NextResponse.json({ error: 'Phone already registered' }, { status: 409 })
  }

  const { error } = await supabase.auth.updateUser({ phone: e164 })
  if (error) {
    console.error('[phone] updateUser error', error)
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { phone, dial_code, token } = body as Record<string, unknown>
  if (typeof phone !== 'string' || typeof dial_code !== 'string' || typeof token !== 'string') {
    return NextResponse.json({ error: 'phone, dial_code, token required' }, { status: 400 })
  }

  const e164 = toE164(phone, dial_code)

  const { error } = await supabase.auth.verifyOtp({
    phone: e164,
    token,
    type: 'phone_change',
  })

  if (error) {
    console.error('[phone] verifyOtp error', error)
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/user/phone/route.ts
git commit -m "feat: phone OTP send and verify routes"
```

---

## Task 10: Export route — add phone + limit enforcement

**Files:**
- Modify: `app/api/clips/[id]/export/route.ts`

- [ ] **Step 1: Add checks at top of POST handler**

Open `app/api/clips/[id]/export/route.ts`. After the auth check (line 14), add:

```typescript
  // Phone verification check
  const { data: { user: fullUser } } = await supabase.auth.getUser()
  if (!fullUser?.phone_confirmed_at) {
    return NextResponse.json({ error: 'phone_required' }, { status: 403 })
  }

  // Plan limit check
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, exports_used')
    .eq('user_id', user.id)
    .single()

  const plan = (sub?.plan ?? 'free') as import('@/lib/plans').PlanName
  const exportsUsed = sub?.exports_used ?? 0

  if ((await import('@/lib/plans')).isAtLimit(plan, exportsUsed)) {
    return NextResponse.json({
      error: 'limit_reached',
      plan,
      exports_used: exportsUsed,
      limit: (await import('@/lib/plans')).getPlanLimit(plan),
    }, { status: 403 })
  }
```

Then after the worker dispatch succeeds (after `return NextResponse.json({ ok: true })`), add the counter increment before the return:

```typescript
  // Increment export counter
  const svc2 = createServiceClient()
  await svc2
    .from('subscriptions')
    .update({ exports_used: exportsUsed + 1, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
```

- [ ] **Step 2: Fix imports at top of file — add createServiceClient if not already there**

The file already imports `createServiceClient` from task context — verify line 2:
```typescript
import { createClient, createServiceClient } from '@/lib/supabase/server'
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/api/clips/[id]/export/route.ts
git commit -m "feat: enforce phone verification and plan limits on export"
```

---

## Task 11: `components/phone/PhoneVerifyModal.tsx`

**Files:**
- Create: `components/phone/PhoneVerifyModal.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useState, useRef, useEffect } from 'react'

interface Country {
  name: string
  code: string
  dial: string
  flag: string
}

const COUNTRIES: Country[] = [
  { name: 'Romania', code: 'RO', dial: '40', flag: '🇷🇴' },
  { name: 'United States', code: 'US', dial: '1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', dial: '44', flag: '🇬🇧' },
  { name: 'Germany', code: 'DE', dial: '49', flag: '🇩🇪' },
  { name: 'France', code: 'FR', dial: '33', flag: '🇫🇷' },
  { name: 'Italy', code: 'IT', dial: '39', flag: '🇮🇹' },
  { name: 'Spain', code: 'ES', dial: '34', flag: '🇪🇸' },
  { name: 'Netherlands', code: 'NL', dial: '31', flag: '🇳🇱' },
  { name: 'Belgium', code: 'BE', dial: '32', flag: '🇧🇪' },
  { name: 'Switzerland', code: 'CH', dial: '41', flag: '🇨🇭' },
  { name: 'Austria', code: 'AT', dial: '43', flag: '🇦🇹' },
  { name: 'Poland', code: 'PL', dial: '48', flag: '🇵🇱' },
  { name: 'Hungary', code: 'HU', dial: '36', flag: '🇭🇺' },
  { name: 'Czech Republic', code: 'CZ', dial: '420', flag: '🇨🇿' },
  { name: 'Bulgaria', code: 'BG', dial: '359', flag: '🇧🇬' },
  { name: 'Greece', code: 'GR', dial: '30', flag: '🇬🇷' },
  { name: 'Portugal', code: 'PT', dial: '351', flag: '🇵🇹' },
  { name: 'Sweden', code: 'SE', dial: '46', flag: '🇸🇪' },
  { name: 'Norway', code: 'NO', dial: '47', flag: '🇳🇴' },
  { name: 'Denmark', code: 'DK', dial: '45', flag: '🇩🇰' },
  { name: 'Finland', code: 'FI', dial: '358', flag: '🇫🇮' },
  { name: 'Canada', code: 'CA', dial: '1', flag: '🇨🇦' },
  { name: 'Australia', code: 'AU', dial: '61', flag: '🇦🇺' },
  { name: 'India', code: 'IN', dial: '91', flag: '🇮🇳' },
  { name: 'Brazil', code: 'BR', dial: '55', flag: '🇧🇷' },
  { name: 'Mexico', code: 'MX', dial: '52', flag: '🇲🇽' },
  { name: 'Turkey', code: 'TR', dial: '90', flag: '🇹🇷' },
  { name: 'Ukraine', code: 'UA', dial: '380', flag: '🇺🇦' },
  { name: 'Moldova', code: 'MD', dial: '373', flag: '🇲🇩' },
  { name: 'Serbia', code: 'RS', dial: '381', flag: '🇷🇸' },
]

interface PhoneVerifyModalProps {
  onVerified: () => void
  onClose: () => void
}

export default function PhoneVerifyModal({ onVerified, onClose }: PhoneVerifyModalProps) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [search, setSearch] = useState('')
  const [showCountries, setShowCountries] = useState(false)
  const [selected, setSelected] = useState<Country>(COUNTRIES[0])
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendCountdown, setResendCountdown] = useState(0)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.includes(search.replace('+', ''))
  )

  useEffect(() => {
    if (resendCountdown <= 0) return
    const t = setTimeout(() => setResendCountdown(v => v - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCountdown])

  async function handleSend() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/user/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, dial_code: selected.dial }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error === 'Phone already registered'
          ? 'This phone number is already registered to another account.'
          : data.error ?? 'Failed to send code')
        return
      }
      setStep('otp')
      setResendCountdown(30)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    setError(null)
    setLoading(true)
    const token = otp.join('')
    try {
      const res = await fetch('/api/user/phone', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, dial_code: selected.dial, token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Invalid code')
        setOtp(['', '', '', '', '', ''])
        otpRefs.current[0]?.focus()
        return
      }
      onVerified()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleOtpInput(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    if (digit && index < 5) otpRefs.current[index + 1]?.focus()
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const maskedPhone = `+${selected.dial} ${phone.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3')}`

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: '#111', border: '1px solid #222', borderRadius: '16px',
        padding: '32px', width: '100%', maxWidth: '420px',
        boxShadow: '0 0 60px rgba(168,85,247,0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>📱</div>
            <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>Verify your phone</h2>
            <p style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>One-time verification to prevent abuse.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
        </div>

        {step === 'phone' && (
          <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {/* Country selector */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowCountries(v => !v)}
                  style={{
                    height: '48px', padding: '0 12px', background: '#1a1a1a',
                    border: '1px solid #333', borderRadius: '10px', color: '#fff',
                    cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '14px',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  {selected.flag} +{selected.dial} <span style={{ color: '#666' }}>▾</span>
                </button>
                {showCountries && (
                  <div style={{
                    position: 'absolute', top: '52px', left: 0, zIndex: 10,
                    background: '#1a1a1a', border: '1px solid #333', borderRadius: '10px',
                    width: '240px', maxHeight: '240px', overflowY: 'auto',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  }}>
                    <div style={{ padding: '8px' }}>
                      <input
                        autoFocus
                        placeholder="Search country..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                          width: '100%', padding: '8px 10px', background: '#111',
                          border: '1px solid #333', borderRadius: '8px', color: '#fff',
                          fontSize: '13px', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    {filtered.map(c => (
                      <button
                        key={c.code}
                        onClick={() => { setSelected(c); setShowCountries(false); setSearch('') }}
                        style={{
                          width: '100%', padding: '10px 12px', background: 'none',
                          border: 'none', color: '#ccc', cursor: 'pointer', textAlign: 'left',
                          fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#222')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        {c.flag} {c.name} <span style={{ color: '#666', marginLeft: 'auto' }}>+{c.dial}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Phone input */}
              <input
                type="tel"
                placeholder="07XX XXX XXX"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                style={{
                  flex: 1, height: '48px', padding: '0 14px', background: '#1a1a1a',
                  border: '1px solid #333', borderRadius: '10px', color: '#fff',
                  fontSize: '15px', outline: 'none',
                }}
              />
            </div>

            {error && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

            <button
              onClick={handleSend}
              disabled={loading || phone.length < 7}
              style={{
                width: '100%', height: '48px', background: loading || phone.length < 7
                  ? '#2a1a3e' : 'linear-gradient(135deg,#7C3AED,#C026D3)',
                border: 'none', borderRadius: '10px', color: '#fff',
                fontSize: '15px', fontWeight: 600, cursor: loading || phone.length < 7 ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Sending...' : 'Send Code →'}
            </button>
          </>
        )}

        {step === 'otp' && (
          <>
            <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '20px' }}>
              Enter the 6-digit code sent to <strong style={{ color: '#fff' }}>{maskedPhone}</strong>
            </p>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { otpRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpInput(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  style={{
                    width: '44px', height: '52px', textAlign: 'center',
                    background: '#1a1a1a', border: `1px solid ${digit ? '#A855F7' : '#333'}`,
                    borderRadius: '10px', color: '#fff', fontSize: '20px', fontWeight: 700,
                    outline: 'none',
                  }}
                />
              ))}
            </div>

            {error && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>{error}</p>}

            <button
              onClick={handleVerify}
              disabled={loading || otp.join('').length !== 6}
              style={{
                width: '100%', height: '48px',
                background: loading || otp.join('').length !== 6
                  ? '#2a1a3e' : 'linear-gradient(135deg,#7C3AED,#C026D3)',
                border: 'none', borderRadius: '10px', color: '#fff',
                fontSize: '15px', fontWeight: 600,
                cursor: loading || otp.join('').length !== 6 ? 'not-allowed' : 'pointer',
                marginBottom: '12px',
              }}
            >
              {loading ? 'Verifying...' : 'Verify →'}
            </button>

            <button
              onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError(null) }}
              disabled={resendCountdown > 0}
              style={{
                width: '100%', height: '36px', background: 'none', border: 'none',
                color: resendCountdown > 0 ? '#555' : '#A855F7',
                fontSize: '13px', cursor: resendCountdown > 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend code'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/phone/PhoneVerifyModal.tsx
git commit -m "feat: PhoneVerifyModal with country search and OTP input"
```

---

## Task 12: `components/billing/UpsellModal.tsx`

**Files:**
- Create: `components/billing/UpsellModal.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface UpsellModalProps {
  plan: string
  exportsUsed: number
  limit: number
  onClose: () => void
}

const UPSELL_PLANS = [
  { name: 'CREATOR', price: '€19', exports: '40 exports/month', planKey: 'creator' },
  { name: 'PRO', price: '€49', exports: '150 exports/month', planKey: 'pro' },
]

export default function UpsellModal({ plan, exportsUsed, limit, onClose }: UpsellModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleUpgrade(planKey: string) {
    setLoading(planKey)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      const data = await res.json()
      if (data.url) router.push(data.url)
    } catch {
      setLoading(null)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: '#111', border: '1px solid #222', borderRadius: '16px',
        padding: '32px', width: '100%', maxWidth: '480px',
        boxShadow: '0 0 60px rgba(168,85,247,0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <span style={{ fontSize: '24px' }}>⚡</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>

        <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: '0 0 6px' }}>
          You've reached your limit
        </h2>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
          You've used <strong style={{ color: '#fff' }}>{exportsUsed}/{limit}</strong> exports this month on the <strong style={{ color: '#A855F7' }}>{plan.toUpperCase()}</strong> plan.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          {UPSELL_PLANS.map(p => (
            <div key={p.planKey} style={{
              background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px',
              padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <div style={{ color: '#A855F7', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em' }}>{p.name}</div>
              <div style={{ color: '#fff', fontSize: '24px', fontWeight: 800 }}>{p.price}<span style={{ fontSize: '13px', color: '#666' }}>/mo</span></div>
              <div style={{ color: '#aaa', fontSize: '13px' }}>{p.exports}</div>
              <button
                onClick={() => handleUpgrade(p.planKey)}
                disabled={loading === p.planKey}
                style={{
                  marginTop: '8px', padding: '10px', background: 'linear-gradient(135deg,#7C3AED,#C026D3)',
                  border: 'none', borderRadius: '8px', color: '#fff',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {loading === p.planKey ? 'Redirecting...' : 'Upgrade →'}
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '12px', background: 'none',
            border: '1px solid #222', borderRadius: '10px',
            color: '#666', fontSize: '14px', cursor: 'pointer',
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/billing/UpsellModal.tsx
git commit -m "feat: UpsellModal with plan upgrade cards"
```

---

## Task 13: Wire modals into ExportModal

**Files:**
- Modify: `components/project/ExportModal.tsx`

- [ ] **Step 1: Read current ExportModal to find the export trigger**

The export is triggered by a POST to `/api/clips/${clipId}/export`. Find the fetch call and wrap it:

```typescript
// At the top of the file, add imports:
import PhoneVerifyModal from '@/components/phone/PhoneVerifyModal'
import UpsellModal from '@/components/billing/UpsellModal'
```

- [ ] **Step 2: Add state for modals**

Inside the component, add state:

```typescript
const [showPhone, setShowPhone] = useState(false)
const [upsellData, setUpsellData] = useState<{ plan: string; exports_used: number; limit: number } | null>(null)
```

- [ ] **Step 3: Handle 403 responses from export route**

Find the fetch call to `/api/clips/${clipId}/export`. After `const res = await fetch(...)`, add handling:

```typescript
if (res.status === 403) {
  const data = await res.json()
  if (data.error === 'phone_required') {
    setShowPhone(true)
    return
  }
  if (data.error === 'limit_reached') {
    setUpsellData({ plan: data.plan, exports_used: data.exports_used, limit: data.limit })
    return
  }
}
```

- [ ] **Step 4: Render modals in JSX**

At the bottom of the component's return, before the closing fragment/div:

```typescript
{showPhone && (
  <PhoneVerifyModal
    onVerified={() => { setShowPhone(false); handleExport() }}
    onClose={() => setShowPhone(false)}
  />
)}
{upsellData && (
  <UpsellModal
    plan={upsellData.plan}
    exportsUsed={upsellData.exports_used}
    limit={upsellData.limit}
    onClose={() => setUpsellData(null)}
  />
)}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add components/project/ExportModal.tsx
git commit -m "feat: wire PhoneVerifyModal and UpsellModal into export flow"
```

---

## Task 14: `components/billing/PricingCards.tsx`

**Files:**
- Create: `components/billing/PricingCards.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PlanName } from '@/lib/plans'

interface PricingCardsProps {
  currentPlan: PlanName
  exportsUsed: number
}

const PLANS = [
  {
    key: 'free' as PlanName,
    label: 'FREE',
    price: '€0',
    period: '',
    exports: '3 exports/month',
    features: ['1080p export', 'AI clip detection', 'AI captions'],
    cta: null,
  },
  {
    key: 'creator' as PlanName,
    label: 'CREATOR',
    price: '€19',
    period: '/month',
    exports: '40 exports/month',
    features: ['1080p export', 'AI clip detection', 'AI captions', 'Priority support'],
    cta: 'creator',
  },
  {
    key: 'pro' as PlanName,
    label: 'PRO',
    price: '€49',
    period: '/month',
    exports: '150 exports/month',
    features: ['1080p export', 'AI clip detection', 'AI captions', 'Analytics', 'Priority rendering'],
    cta: 'pro',
  },
  {
    key: 'agency' as PlanName,
    label: 'AGENCY',
    price: '€149',
    period: '/month',
    exports: '2000 exports/month',
    features: ['1080p export', 'AI clip detection', 'AI captions', 'Analytics', 'Team members', 'Priority support'],
    cta: 'agency',
  },
]

export default function PricingCards({ currentPlan, exportsUsed }: PricingCardsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleUpgrade(planKey: string) {
    setLoading(planKey)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      const data = await res.json()
      if (data.url) router.push(data.url)
    } catch {
      setLoading(null)
    }
  }

  async function handleManage() {
    setLoading('portal')
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) router.push(data.url)
    } catch {
      setLoading(null)
    }
  }

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        {PLANS.map(plan => {
          const isCurrent = plan.key === currentPlan
          return (
            <div key={plan.key} style={{
              background: '#0d0d0d',
              border: isCurrent ? '1px solid #A855F7' : '1px solid #1e1e1e',
              borderRadius: '14px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: isCurrent ? '0 0 24px rgba(168,85,247,0.1)' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ color: '#A855F7', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em' }}>
                  {plan.label}
                </span>
                {isCurrent && (
                  <span style={{
                    background: 'rgba(168,85,247,0.15)', color: '#A855F7',
                    fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px',
                  }}>
                    Current
                  </span>
                )}
              </div>

              <div style={{ color: '#fff', fontSize: '28px', fontWeight: 800 }}>
                {plan.price}
                <span style={{ fontSize: '13px', color: '#666', fontWeight: 400 }}>{plan.period}</span>
              </div>

              <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '8px' }}>{plan.exports}</div>

              {isCurrent && plan.key !== 'free' && (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>
                    {exportsUsed} / {plan.exports.split(' ')[0]} used
                  </div>
                  <div style={{ height: '4px', background: '#1a1a1a', borderRadius: '4px' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (exportsUsed / parseInt(plan.exports)) * 100)}%`,
                      background: 'linear-gradient(90deg,#7C3AED,#C026D3)',
                      borderRadius: '4px',
                    }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                {plan.features.map(f => (
                  <div key={f} style={{ color: '#888', fontSize: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ color: '#A855F7' }}>✓</span> {f}
                  </div>
                ))}
              </div>

              {isCurrent && plan.key !== 'free' ? (
                <button
                  onClick={handleManage}
                  disabled={loading === 'portal'}
                  style={{
                    padding: '10px', background: '#1a1a1a', border: '1px solid #333',
                    borderRadius: '8px', color: '#aaa', fontSize: '13px',
                    cursor: 'pointer', fontWeight: 500,
                  }}
                >
                  {loading === 'portal' ? 'Loading...' : 'Manage subscription'}
                </button>
              ) : plan.cta && !isCurrent ? (
                <button
                  onClick={() => handleUpgrade(plan.cta!)}
                  disabled={!!loading}
                  style={{
                    padding: '10px',
                    background: 'linear-gradient(135deg,#7C3AED,#C026D3)',
                    border: 'none', borderRadius: '8px', color: '#fff',
                    fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading === plan.cta ? 'Redirecting...' : `Upgrade to ${plan.label} →`}
                </button>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* Enterprise card */}
      <div style={{
        background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '14px',
        padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '16px',
      }}>
        <div>
          <div style={{ color: '#A855F7', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '4px' }}>ENTERPRISE</div>
          <div style={{ color: '#fff', fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>Need more than 2,000 exports/month?</div>
          <div style={{ color: '#666', fontSize: '13px' }}>Custom pricing, invoicing, dedicated support.</div>
        </div>
        <a
          href="mailto:hello@viralhook.media"
          style={{
            padding: '10px 20px', background: '#1a1a1a', border: '1px solid #333',
            borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600,
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}
        >
          Contact Us →
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/billing/PricingCards.tsx
git commit -m "feat: PricingCards component with all plans"
```

---

## Task 15: Billing page

**Files:**
- Modify: `app/(dashboard)/billing/page.tsx`

- [ ] **Step 1: Replace placeholder**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/dashboard/PageHeader'
import PricingCards from '@/components/billing/PricingCards'
import type { PlanName } from '@/lib/plans'
import { PLAN_LIMITS } from '@/lib/plans'

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, exports_used')
    .eq('user_id', user.id)
    .single()

  const plan = (sub?.plan ?? 'free') as PlanName
  const exportsUsed = sub?.exports_used ?? 0
  const limit = PLAN_LIMITS[plan]

  const params = await searchParams
  const success = params.success === 'true'

  return (
    <div style={{ padding: '28px 28px 40px' }}>
      <PageHeader
        title="Billing"
        breadcrumb="Dashboard / Billing"
        description="Manage your subscription and payment details."
      />

      {success && (
        <div style={{
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: '10px', padding: '14px 18px', marginBottom: '24px', color: '#86efac', fontSize: '14px',
        }}>
          ✓ Subscription activated successfully! Your plan has been upgraded.
        </div>
      )}

      {/* Usage summary */}
      <div style={{
        background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '14px',
        padding: '20px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '24px',
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ color: '#666', fontSize: '12px', marginBottom: '2px' }}>Current plan</div>
          <div style={{ color: '#A855F7', fontWeight: 700, fontSize: '16px' }}>{plan.toUpperCase()}</div>
        </div>
        <div style={{ flex: 1, minWidth: '160px' }}>
          <div style={{ color: '#666', fontSize: '12px', marginBottom: '6px' }}>
            Exports this month — {exportsUsed} / {limit}
          </div>
          <div style={{ height: '6px', background: '#1a1a1a', borderRadius: '4px' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, (exportsUsed / limit) * 100)}%`,
              background: exportsUsed >= limit
                ? 'linear-gradient(90deg,#ef4444,#f97316)'
                : 'linear-gradient(90deg,#7C3AED,#C026D3)',
              borderRadius: '4px',
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
      </div>

      <PricingCards currentPlan={plan} exportsUsed={exportsUsed} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/billing/page.tsx"
git commit -m "feat: billing page with usage bar and pricing cards"
```

---

## Task 16: Layout + Sidebar — show plan badge

**Files:**
- Modify: `app/(dashboard)/layout.tsx`
- Modify: `components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Update layout to fetch plan**

Replace `plan="FREE"` hardcode in `app/(dashboard)/layout.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import type { PlanName } from '@/lib/plans'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .single()

  const plan = (sub?.plan ?? 'free') as PlanName

  return (
    <div className="dashboard-layout">
      <Sidebar
        email={user.email ?? ''}
        fullName={user.user_metadata?.full_name ?? user.user_metadata?.name}
        plan={plan}
      />
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Update Sidebar plan prop type and display**

In `components/dashboard/Sidebar.tsx`, find the `SidebarProps` interface and update:

```typescript
interface SidebarProps {
  email: string
  fullName?: string
  plan?: string
}
```

Find where the user email/name is displayed at the bottom of the sidebar and add the plan badge after the email. Search for where `email` is rendered and add below it:

```typescript
{plan && (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
    <span style={{
      background: 'rgba(168,85,247,0.15)', color: '#A855F7',
      fontSize: '10px', fontWeight: 700, padding: '2px 8px',
      borderRadius: '20px', letterSpacing: '0.08em',
    }}>
      {plan.toUpperCase()}
    </span>
    {plan === 'free' && (
      <a href="/billing" style={{ color: '#666', fontSize: '11px', textDecoration: 'none' }}>
        Upgrade →
      </a>
    )}
  </div>
)}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/layout.tsx" components/dashboard/Sidebar.tsx
git commit -m "feat: show plan badge in sidebar"
```

---

## Task 17: Run all tests + deploy

- [ ] **Step 1: Run full test suite**

```bash
cd /d/CLAUDE/proiecte/viralhook
npx vitest run
```

Expected: all tests pass (existing 29 + new 10 = 39 total)

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Push to GitHub (triggers Vercel deploy)**

```bash
git push origin main
```

- [ ] **Step 4: Verify Vercel deployment**

Check Vercel dashboard — deployment should succeed. Open `https://viralhook-chi.vercel.app/billing` and verify pricing cards load.

- [ ] **Step 5: Test webhook locally with Stripe CLI (optional but recommended)**

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Then trigger a test checkout and verify plan updates in Supabase.

---

## Self-Review

**Spec coverage:**
- ✅ subscriptions table + trigger + cron — Task 2
- ✅ lib/plans.ts constants — Task 3
- ✅ Stripe checkout route — Task 6
- ✅ Stripe portal route — Task 7
- ✅ Webhook (3 events) — Task 8
- ✅ Phone OTP send + verify — Task 9
- ✅ Export enforcement (phone + limit) — Task 10
- ✅ PhoneVerifyModal (country search, OTP boxes) — Task 11
- ✅ UpsellModal (shows at limit) — Task 12
- ✅ Wired into ExportModal — Task 13
- ✅ PricingCards (all 4 plans + Enterprise contact) — Task 14
- ✅ Billing page with usage bar — Task 15
- ✅ Sidebar plan badge — Task 16
- ✅ Enterprise "Contact Us" card — Task 14

**Type consistency:**
- `PlanName` defined in `lib/plans.ts`, used consistently in webhook, checkout, billing page, layout
- `Subscription` interface exported from `lib/plans.ts`, not redefined elsewhere
- `resolveWebhookPlan` exported from webhook route for testability

**No placeholders:** all steps contain complete code.
