import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/dashboard/PageHeader'
import { PLAN_PRICES_EUR } from '@/lib/plans'
import type { PlanName } from '@/lib/plans'
import AdminPlanSelector from '@/components/admin/AdminPlanSelector'
import AdminDeleteButton from '@/components/admin/AdminDeleteButton'

const ADMIN_EMAIL = 'popescu2290@gmail.com'

const COUNTRY_PREFIXES: { prefix: string; code: string; flag: string }[] = [
  // 3-digit prefixes first (resolved by sort, but listed for readability)
  { prefix: '355', code: 'AL', flag: '🇦🇱' },
  { prefix: '376', code: 'AD', flag: '🇦🇩' },
  { prefix: '374', code: 'AM', flag: '🇦🇲' },
  { prefix: '297', code: 'AW', flag: '🇦🇼' },
  { prefix: '994', code: 'AZ', flag: '🇦🇿' },
  { prefix: '387', code: 'BA', flag: '🇧🇦' },
  { prefix: '880', code: 'BD', flag: '🇧🇩' },
  { prefix: '375', code: 'BY', flag: '🇧🇾' },
  { prefix: '501', code: 'BZ', flag: '🇧🇿' },
  { prefix: '243', code: 'CD', flag: '🇨🇩' },
  { prefix: '236', code: 'CF', flag: '🇨🇫' },
  { prefix: '242', code: 'CG', flag: '🇨🇬' },
  { prefix: '225', code: 'CI', flag: '🇨🇮' },
  { prefix: '682', code: 'CK', flag: '🇨🇰' },
  { prefix: '237', code: 'CM', flag: '🇨🇲' },
  { prefix: '506', code: 'CR', flag: '🇨🇷' },
  { prefix: '238', code: 'CV', flag: '🇨🇻' },
  { prefix: '357', code: 'CY', flag: '🇨🇾' },
  { prefix: '420', code: 'CZ', flag: '🇨🇿' },
  { prefix: '253', code: 'DJ', flag: '🇩🇯' },
  { prefix: '503', code: 'SV', flag: '🇸🇻' },
  { prefix: '291', code: 'ER', flag: '🇪🇷' },
  { prefix: '251', code: 'ET', flag: '🇪🇹' },
  { prefix: '679', code: 'FJ', flag: '🇫🇯' },
  { prefix: '298', code: 'FO', flag: '🇫🇴' },
  { prefix: '241', code: 'GA', flag: '🇬🇦' },
  { prefix: '995', code: 'GE', flag: '🇬🇪' },
  { prefix: '299', code: 'GL', flag: '🇬🇱' },
  { prefix: '220', code: 'GM', flag: '🇬🇲' },
  { prefix: '224', code: 'GN', flag: '🇬🇳' },
  { prefix: '240', code: 'GQ', flag: '🇬🇶' },
  { prefix: '502', code: 'GT', flag: '🇬🇹' },
  { prefix: '245', code: 'GW', flag: '🇬🇼' },
  { prefix: '592', code: 'GY', flag: '🇬🇾' },
  { prefix: '504', code: 'HN', flag: '🇭🇳' },
  { prefix: '385', code: 'HR', flag: '🇭🇷' },
  { prefix: '509', code: 'HT', flag: '🇭🇹' },
  { prefix: '852', code: 'HK', flag: '🇭🇰' },
  { prefix: '354', code: 'IS', flag: '🇮🇸' },
  { prefix: '353', code: 'IE', flag: '🇮🇪' },
  { prefix: '964', code: 'IQ', flag: '🇮🇶' },
  { prefix: '972', code: 'IL', flag: '🇮🇱' },
  { prefix: '962', code: 'JO', flag: '🇯🇴' },
  { prefix: '254', code: 'KE', flag: '🇰🇪' },
  { prefix: '996', code: 'KG', flag: '🇰🇬' },
  { prefix: '855', code: 'KH', flag: '🇰🇭' },
  { prefix: '686', code: 'KI', flag: '🇰🇮' },
  { prefix: '269', code: 'KM', flag: '🇰🇲' },
  { prefix: '850', code: 'KP', flag: '🇰🇵' },
  { prefix: '965', code: 'KW', flag: '🇰🇼' },
  { prefix: '856', code: 'LA', flag: '🇱🇦' },
  { prefix: '961', code: 'LB', flag: '🇱🇧' },
  { prefix: '423', code: 'LI', flag: '🇱🇮' },
  { prefix: '231', code: 'LR', flag: '🇱🇷' },
  { prefix: '266', code: 'LS', flag: '🇱🇸' },
  { prefix: '370', code: 'LT', flag: '🇱🇹' },
  { prefix: '352', code: 'LU', flag: '🇱🇺' },
  { prefix: '371', code: 'LV', flag: '🇱🇻' },
  { prefix: '218', code: 'LY', flag: '🇱🇾' },
  { prefix: '212', code: 'MA', flag: '🇲🇦' },
  { prefix: '373', code: 'MD', flag: '🇲🇩' },
  { prefix: '377', code: 'MC', flag: '🇲🇨' },
  { prefix: '261', code: 'MG', flag: '🇲🇬' },
  { prefix: '389', code: 'MK', flag: '🇲🇰' },
  { prefix: '223', code: 'ML', flag: '🇲🇱' },
  { prefix: '853', code: 'MO', flag: '🇲🇴' },
  { prefix: '222', code: 'MR', flag: '🇲🇷' },
  { prefix: '356', code: 'MT', flag: '🇲🇹' },
  { prefix: '230', code: 'MU', flag: '🇲🇺' },
  { prefix: '960', code: 'MV', flag: '🇲🇻' },
  { prefix: '265', code: 'MW', flag: '🇲🇼' },
  { prefix: '258', code: 'MZ', flag: '🇲🇿' },
  { prefix: '264', code: 'NA', flag: '🇳🇦' },
  { prefix: '227', code: 'NE', flag: '🇳🇪' },
  { prefix: '234', code: 'NG', flag: '🇳🇬' },
  { prefix: '505', code: 'NI', flag: '🇳🇮' },
  { prefix: '977', code: 'NP', flag: '🇳🇵' },
  { prefix: '674', code: 'NR', flag: '🇳🇷' },
  { prefix: '968', code: 'OM', flag: '🇴🇲' },
  { prefix: '507', code: 'PA', flag: '🇵🇦' },
  { prefix: '595', code: 'PY', flag: '🇵🇾' },
  { prefix: '974', code: 'QA', flag: '🇶🇦' },
  { prefix: '250', code: 'RW', flag: '🇷🇼' },
  { prefix: '966', code: 'SA', flag: '🇸🇦' },
  { prefix: '677', code: 'SB', flag: '🇸🇧' },
  { prefix: '249', code: 'SD', flag: '🇸🇩' },
  { prefix: '248', code: 'SC', flag: '🇸🇨' },
  { prefix: '221', code: 'SN', flag: '🇸🇳' },
  { prefix: '252', code: 'SO', flag: '🇸🇴' },
  { prefix: '378', code: 'SM', flag: '🇸🇲' },
  { prefix: '386', code: 'SI', flag: '🇸🇮' },
  { prefix: '421', code: 'SK', flag: '🇸🇰' },
  { prefix: '232', code: 'SL', flag: '🇸🇱' },
  { prefix: '963', code: 'SY', flag: '🇸🇾' },
  { prefix: '268', code: 'SZ', flag: '🇸🇿' },
  { prefix: '235', code: 'TD', flag: '🇹🇩' },
  { prefix: '228', code: 'TG', flag: '🇹🇬' },
  { prefix: '992', code: 'TJ', flag: '🇹🇯' },
  { prefix: '670', code: 'TL', flag: '🇹🇱' },
  { prefix: '993', code: 'TM', flag: '🇹🇲' },
  { prefix: '216', code: 'TN', flag: '🇹🇳' },
  { prefix: '676', code: 'TO', flag: '🇹🇴' },
  { prefix: '886', code: 'TW', flag: '🇹🇼' },
  { prefix: '255', code: 'TZ', flag: '🇹🇿' },
  { prefix: '380', code: 'UA', flag: '🇺🇦' },
  { prefix: '256', code: 'UG', flag: '🇺🇬' },
  { prefix: '598', code: 'UY', flag: '🇺🇾' },
  { prefix: '998', code: 'UZ', flag: '🇺🇿' },
  { prefix: '678', code: 'VU', flag: '🇻🇺' },
  { prefix: '685', code: 'WS', flag: '🇼🇸' },
  { prefix: '967', code: 'YE', flag: '🇾🇪' },
  { prefix: '213', code: 'DZ', flag: '🇩🇿' },
  { prefix: '593', code: 'EC', flag: '🇪🇨' },
  { prefix: '372', code: 'EE', flag: '🇪🇪' },
  { prefix: '351', code: 'PT', flag: '🇵🇹' },
  { prefix: '359', code: 'BG', flag: '🇧🇬' },
  { prefix: '358', code: 'FI', flag: '🇫🇮' },
  { prefix: '381', code: 'RS', flag: '🇷🇸' },
  { prefix: '382', code: 'ME', flag: '🇲🇪' },
  { prefix: '383', code: 'XK', flag: '🇽🇰' },
  // 2-digit prefixes
  { prefix: '20', code: 'EG', flag: '🇪🇬' },
  { prefix: '27', code: 'ZA', flag: '🇿🇦' },
  { prefix: '30', code: 'GR', flag: '🇬🇷' },
  { prefix: '31', code: 'NL', flag: '🇳🇱' },
  { prefix: '32', code: 'BE', flag: '🇧🇪' },
  { prefix: '33', code: 'FR', flag: '🇫🇷' },
  { prefix: '34', code: 'ES', flag: '🇪🇸' },
  { prefix: '36', code: 'HU', flag: '🇭🇺' },
  { prefix: '39', code: 'IT', flag: '🇮🇹' },
  { prefix: '40', code: 'RO', flag: '🇷🇴' },
  { prefix: '41', code: 'CH', flag: '🇨🇭' },
  { prefix: '43', code: 'AT', flag: '🇦🇹' },
  { prefix: '44', code: 'GB', flag: '🇬🇧' },
  { prefix: '45', code: 'DK', flag: '🇩🇰' },
  { prefix: '46', code: 'SE', flag: '🇸🇪' },
  { prefix: '47', code: 'NO', flag: '🇳🇴' },
  { prefix: '48', code: 'PL', flag: '🇵🇱' },
  { prefix: '49', code: 'DE', flag: '🇩🇪' },
  { prefix: '51', code: 'PE', flag: '🇵🇪' },
  { prefix: '52', code: 'MX', flag: '🇲🇽' },
  { prefix: '53', code: 'CU', flag: '🇨🇺' },
  { prefix: '54', code: 'AR', flag: '🇦🇷' },
  { prefix: '55', code: 'BR', flag: '🇧🇷' },
  { prefix: '56', code: 'CL', flag: '🇨🇱' },
  { prefix: '57', code: 'CO', flag: '🇨🇴' },
  { prefix: '58', code: 'VE', flag: '🇻🇪' },
  { prefix: '60', code: 'MY', flag: '🇲🇾' },
  { prefix: '61', code: 'AU', flag: '🇦🇺' },
  { prefix: '62', code: 'ID', flag: '🇮🇩' },
  { prefix: '63', code: 'PH', flag: '🇵🇭' },
  { prefix: '64', code: 'NZ', flag: '🇳🇿' },
  { prefix: '65', code: 'SG', flag: '🇸🇬' },
  { prefix: '66', code: 'TH', flag: '🇹🇭' },
  { prefix: '81', code: 'JP', flag: '🇯🇵' },
  { prefix: '82', code: 'KR', flag: '🇰🇷' },
  { prefix: '84', code: 'VN', flag: '🇻🇳' },
  { prefix: '86', code: 'CN', flag: '🇨🇳' },
  { prefix: '90', code: 'TR', flag: '🇹🇷' },
  { prefix: '91', code: 'IN', flag: '🇮🇳' },
  { prefix: '92', code: 'PK', flag: '🇵🇰' },
  { prefix: '93', code: 'AF', flag: '🇦🇫' },
  { prefix: '94', code: 'LK', flag: '🇱🇰' },
  { prefix: '95', code: 'MM', flag: '🇲🇲' },
  { prefix: '98', code: 'IR', flag: '🇮🇷' },
  // 1-digit prefix
  { prefix: '7',  code: 'RU', flag: '🇷🇺' },
  { prefix: '1',  code: 'US', flag: '🇺🇸' },
]

function formatPhone(phone: string | null | undefined): { flag: string; code: string; prefix: string; local: string } | null {
  if (!phone) return null
  // Supabase stores E.164 without '+', e.g. "40756416379"
  const digits = phone.replace(/\D/g, '')
  // Sort by prefix length descending to match longest first
  const sorted = [...COUNTRY_PREFIXES].sort((a, b) => b.prefix.length - a.prefix.length)
  for (const c of sorted) {
    if (digits.startsWith(c.prefix)) {
      return { flag: c.flag, code: c.code, prefix: c.prefix, local: digits.slice(c.prefix.length) }
    }
  }
  return { flag: '🌍', code: '', prefix: '', local: digits }
}

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
                  {['Email', 'Phone', 'Plan', 'Exports Used', 'Joined', 'Change Plan', 'Delete'].map(h => (
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
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const fp = formatPhone(u.phone)
                          if (!fp) return <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>—</span>
                          return (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ fontSize: 14 }}>{fp.flag}</span>
                              <span style={{ color: '#A855F7', fontSize: 10, fontWeight: 700 }}>
                                {fp.code}{fp.prefix ? ` +${fp.prefix}` : ''}
                              </span>
                              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{fp.local}</span>
                              {u.phone_confirmed_at
                                ? <span title="Verified" style={{ color: '#4ADE80', fontSize: 11, fontWeight: 700 }}>✓</span>
                                : <span title="Not verified" style={{ color: '#F87171', fontSize: 11, fontWeight: 700 }}>✗</span>
                              }
                            </span>
                          )
                        })()}
                      </td>
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
                    <td colSpan={7} style={{ padding: '24px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
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
