import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/dashboard/PageHeader'
import { PLAN_PRICES_EUR } from '@/lib/plans'
import type { PlanName } from '@/lib/plans'
import AdminPlanSelector from '@/components/admin/AdminPlanSelector'
import AdminDeleteButton from '@/components/admin/AdminDeleteButton'

const ADMIN_EMAIL = 'popescu2290@gmail.com'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (user.email !== ADMIN_EMAIL) redirect('/dashboard')

  const admin = createServiceClient()

  const [
    { data: authData },
    { data: subscriptions },
    { count: projectCount },
    { count: clipCount },
    { count: exportCount },
  ] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from('subscriptions').select('user_id, plan, exports_used, created_at').order('created_at', { ascending: false }),
    admin.from('projects').select('*', { count: 'exact', head: true }),
    admin.from('clips').select('*', { count: 'exact', head: true }),
    admin.from('exports').select('*', { count: 'exact', head: true }),
  ])

  const users = authData?.users ?? []
  const subs = subscriptions ?? []

  const subsByUserId = Object.fromEntries(subs.map(s => [s.user_id, s]))

  const planCounts: Record<string, number> = {}
  for (const sub of subs) {
    planCounts[sub.plan] = (planCounts[sub.plan] ?? 0) + 1
  }

  const mrr =
    (planCounts.creator ?? 0) * PLAN_PRICES_EUR.creator +
    (planCounts.pro ?? 0) * PLAN_PRICES_EUR.pro +
    (planCounts.agency ?? 0) * PLAN_PRICES_EUR.agency

  const recentUsers = users.slice(0, 20)

  return (
    <div style={{ padding: '28px 28px 40px' }} className="admin-page">
      <PageHeader
        title="Admin Panel"
        breadcrumb="Dashboard / Admin"
        description="Platform overview — visible to administrators only."
      />

      {/* Platform Activity */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
          Platform Activity
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }} className="analytics-cards">
          {[
            { label: 'Total Users', value: users.length },
            { label: 'Total Projects', value: projectCount ?? 0 },
            { label: 'Total Clips', value: clipCount ?? 0 },
            { label: 'Total Exports', value: exportCount ?? 0 },
          ].map(card => (
            <div
              key={card.label}
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 12, padding: '16px 20px' }}
            >
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                {card.label}
              </div>
              <div style={{ color: '#E9D5FF', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Plans & Revenue */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
          Plans &amp; Revenue
        </h2>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }} className="analytics-cards admin-plans-grid">
            {(['free', 'creator', 'pro', 'agency'] as PlanName[]).map(plan => (
              <div key={plan}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#A855F7', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  {plan}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#E9D5FF', lineHeight: 1 }}>
                  {planCounts[plan] ?? 0}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>users</div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16, display: 'flex', alignItems: 'baseline', gap: 8 }} className="admin-mrr">
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Estimated MRR
            </span>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#4ADE80' }}>
              {mrr}€
            </span>
          </div>
        </div>
      </section>

      {/* Users */}
      <section>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
          Users (last 20)
        </h2>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['Email', 'Plan', 'Exports Used', 'Joined', 'Change Plan', 'Delete'].map(h => (
                    <th
                      key={h}
                      style={{ padding: '10px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.3)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentUsers.map(u => {
                  const sub = subsByUserId[u.id]
                  const plan = (sub?.plan ?? 'free') as PlanName
                  const exportsUsed = sub?.exports_used ?? 0
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 16px', color: '#E9D5FF' }}>{u.email}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ background: 'rgba(168,85,247,0.15)', color: '#A855F7', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.08em' }}>
                          {plan.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.5)' }}>{exportsUsed}</td>
                      <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.35)', fontSize: 11, whiteSpace: 'nowrap' }}>
                        {new Date(u.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <AdminPlanSelector userId={u.id} currentPlan={plan} />
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <AdminDeleteButton userId={u.id} email={u.email ?? ''} />
                      </td>
                    </tr>
                  )
                })}
                {recentUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
