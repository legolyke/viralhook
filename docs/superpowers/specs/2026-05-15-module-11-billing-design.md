# Module 11 — Stripe Billing & Phone Verification

**Date:** 2026-05-15  
**Status:** Approved

---

## Overview

Module 11 adds monetization to ViralHook via Stripe Checkout (redirect flow) and enforces per-plan export limits. It also adds phone number verification (SMS OTP via Supabase + Twilio) required before the first export, to prevent free-tier abuse via multiple accounts.

---

## Plans & Limits

| Plan | Exports/month | Price | Notes |
|---|---|---|---|
| FREE | 3 | €0 | Auto-assigned at signup |
| CREATOR | 40 | €19/month | Stripe Checkout |
| PRO | 150 | €49/month | Stripe Checkout |
| AGENCY | 2000 | €149/month | Stripe Checkout |
| ENTERPRISE | Custom | Contact Us | No Stripe — email/Calendly only |

**Reset:** exports_used resets to 0 on the 1st of each calendar month via Supabase cron job.  
**Upgrade reset:** exports_used resets to 0 immediately when a user upgrades to a higher plan.  
**Watermark:** not implemented in this module.  
**Resolution:** all plans get 1080p in this module; 4K enforcement deferred.

### Cost analysis (worst case per user/month)

| Plan | Revenue | Server costs | Profit | Margin |
|---|---|---|---|---|
| FREE | €0 | ~$0.15 | -$0.15 | — |
| CREATOR | €19 | ~$2.80 | ~$17.20 | 84% |
| PRO | €49 | ~$7.05 | ~$44.25 | 85% |
| AGENCY | €149 | ~$64.85 | ~$95.40 | 60% |

Fixed costs: ~$7.50/month total (domain + Railway base + Twilio number).

---

## Architecture

### Approach: Supabase as source of truth

Plan data lives in a `subscriptions` table in Supabase. Stripe webhooks update this table on payment events. All enforcement happens by reading from Supabase — no Stripe API call on each export request.

### Data flow

```
Signup → INSERT subscriptions (plan='free', exports_used=0, period_start=1st of month)

Export click
  → phone_verified? NO  → PhoneVerifyModal
  → phone_verified? YES → exports_used >= plan_limit? YES → UpsellModal
                                                      NO  → export starts
                                                            exports_used++

Upgrade click → POST /api/billing/checkout → Stripe Checkout Session
             → redirect to Stripe
             → payment success → Stripe webhook → update subscriptions
             → redirect back to /billing?success=true

Cancel/expire → webhook customer.subscription.deleted → plan='free'
```

---

## Database

### New table: `subscriptions`

```sql
CREATE TABLE subscriptions (
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

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);
```

### Supabase cron job (monthly reset)

```sql
SELECT cron.schedule(
  'reset-monthly-exports',
  '0 0 1 * *',
  $$UPDATE subscriptions SET exports_used = 0, period_start = date_trunc('month', now())::date$$
);
```

### Trigger: auto-create subscription at signup

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO subscriptions (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
```

### Phone verification

Supabase native phone auth (Twilio). The `phone` column is on `auth.users` (managed by Supabase). A user is considered phone-verified when `auth.users.phone_confirmed_at IS NOT NULL`.

---

## New Files

### `lib/plans.ts`
Plan constants and limit lookup.

```typescript
export const PLAN_LIMITS: Record<string, number> = {
  free: 3,
  creator: 40,
  pro: 150,
  agency: 2000,
}

export const PLAN_PRICES: Record<string, string> = {
  creator: process.env.STRIPE_PRICE_CREATOR!,
  pro: process.env.STRIPE_PRICE_PRO!,
  agency: process.env.STRIPE_PRICE_AGENCY!,
}
```

### `lib/stripe.ts`
Stripe client singleton.

### `app/api/billing/checkout/route.ts` — POST
- Auth required
- Body: `{ plan: 'creator' | 'pro' | 'agency' }`
- Creates or retrieves Stripe customer (store stripe_customer_id in subscriptions)
- Creates Checkout Session with `success_url=/billing?success=true`, `cancel_url=/billing`
- Returns `{ url }` → frontend redirects

### `app/api/billing/portal/route.ts` — POST
- Auth required
- Creates Stripe Customer Portal session
- Returns `{ url }` → frontend redirects
- Used for: cancel subscription, update payment method

### `app/api/billing/webhook/route.ts` — POST
- Verifies `stripe-signature` with `stripe.webhooks.constructEvent()`
- Uses service role client (bypass RLS)
- Handles:
  - `checkout.session.completed` → update plan + stripe_subscription_id, reset exports_used=0
  - `customer.subscription.updated` → update plan
  - `customer.subscription.deleted` → set plan='free', clear stripe_subscription_id

### `app/api/user/phone/route.ts`
Two actions:

**POST (send OTP):**
- Body: `{ phone: string }` (E.164 format, e.g. +40712345678)
- Checks phone not already used by another user
- Calls `supabase.auth.signInWithOtp({ phone })`
- Returns `{ ok: true }`

**PUT (verify OTP):**
- Body: `{ phone: string, token: string }`
- Calls `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`
- Returns `{ ok: true }`

---

## Modified Files

### `app/api/clips/[id]/export/route.ts`
Add at the top of the handler (after auth check):

1. Check `auth.users.phone_confirmed_at` — if null, return `{ error: 'phone_required', status: 403 }`
2. Fetch subscription for user
3. Check `exports_used >= PLAN_LIMITS[plan]` — if true, return `{ error: 'limit_reached', plan, exports_used, limit, status: 403 }`
4. After successful worker dispatch: `UPDATE subscriptions SET exports_used = exports_used + 1`

### `app/(dashboard)/layout.tsx`
Fetch subscription plan for current user, pass to Sidebar.

### `components/dashboard/Sidebar.tsx`
Display plan badge under user email: `FREE` / `CREATOR` / `PRO` / `AGENCY` with [Upgrade →] link for free users.

---

## New UI Components

### `components/billing/PricingCards.tsx`
- 4 plan cards (FREE / CREATOR / PRO / AGENCY) + 1 Enterprise contact card
- Current plan has violet border + "Current Plan" badge
- Upgrade button → POST /api/billing/checkout → redirect to Stripe
- Manage button (paid plans) → POST /api/billing/portal → redirect to Stripe Portal
- Mobile: single column stack

### `components/billing/UpsellModal.tsx`
Shown when export route returns `error: 'limit_reached'`.
- Header: "You've reached your limit"
- Body: shows current usage (e.g. "3/3 exports used this month")
- Shows CREATOR and PRO cards with price + limit
- Each card has [Upgrade →] button → triggers checkout
- Footer: [Maybe later] closes modal

### `components/phone/PhoneVerifyModal.tsx`
Shown when export route returns `error: 'phone_required'`.

Step 1 (enter phone):
- Country code selector: searchable dropdown with flag + dial code (e.g. 🇷🇴 +40)
- Phone number input (right side)
- [Send Code →] button → POST /api/user/phone

Step 2 (enter OTP):
- Shows masked phone number
- 6 individual digit inputs (auto-advance on input)
- [Verify] button → PUT /api/user/phone
- [Resend in 30s] countdown button
- On success: close modal, retry export

### `app/(dashboard)/billing/page.tsx`
Replaces placeholder. Shows:
- Current plan summary (usage bar: exports_used / limit)
- PricingCards component
- If paid plan: "Manage subscription" button → portal

---

## Environment Variables (to add to Vercel)

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_CREATOR=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_AGENCY=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

Supabase phone auth: configured in Supabase Dashboard → Authentication → Providers → Phone, using Twilio Account SID + Auth Token + phone number.

---

## Security

- Webhook signature verified with `stripe.webhooks.constructEvent()` — invalid signature → 400
- Phone OTP: Supabase handles rate limiting and token expiry (10 min)
- Phone uniqueness: checked before sending OTP — prevents one number on multiple accounts
- Export limit enforced server-side (not just UI) — client cannot bypass
- Service role client used only in webhook route and trigger function

---

## Out of Scope (this module)

- Watermark on free exports
- 4K resolution enforcement
- Team members / seat-based licensing
- Enterprise billing (manual process)
- Account sharing detection
- Annual billing discount
