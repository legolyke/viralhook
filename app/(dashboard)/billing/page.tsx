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
