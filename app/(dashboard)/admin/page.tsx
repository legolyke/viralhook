import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/dashboard/PageHeader'
import { PLAN_PRICES_EUR } from '@/lib/plans'
import type { PlanName } from '@/lib/plans'
import AdminPlanSelector from '@/components/admin/AdminPlanSelector'
import AdminDeleteButton from '@/components/admin/AdminDeleteButton'
import AdminToggleButton from '@/components/admin/AdminToggleButton'
import { SUPERADMIN_EMAIL } from '@/lib/is-admin'

const COUNTRY_PREFIXES: { prefix: string; code: string; name: string }[] = [
  { prefix: '355', code: 'AL', name: 'Albania' },
  { prefix: '376', code: 'AD', name: 'Andorra' },
  { prefix: '374', code: 'AM', name: 'Armenia' },
  { prefix: '297', code: 'AW', name: 'Aruba' },
  { prefix: '994', code: 'AZ', name: 'Azerbaijan' },
  { prefix: '387', code: 'BA', name: 'Bosnia and Herzegovina' },
  { prefix: '880', code: 'BD', name: 'Bangladesh' },
  { prefix: '375', code: 'BY', name: 'Belarus' },
  { prefix: '501', code: 'BZ', name: 'Belize' },
  { prefix: '243', code: 'CD', name: 'DR Congo' },
  { prefix: '236', code: 'CF', name: 'Central African Republic' },
  { prefix: '242', code: 'CG', name: 'Republic of the Congo' },
  { prefix: '225', code: 'CI', name: "Côte d'Ivoire" },
  { prefix: '682', code: 'CK', name: 'Cook Islands' },
  { prefix: '237', code: 'CM', name: 'Cameroon' },
  { prefix: '506', code: 'CR', name: 'Costa Rica' },
  { prefix: '238', code: 'CV', name: 'Cape Verde' },
  { prefix: '357', code: 'CY', name: 'Cyprus' },
  { prefix: '420', code: 'CZ', name: 'Czech Republic' },
  { prefix: '253', code: 'DJ', name: 'Djibouti' },
  { prefix: '503', code: 'SV', name: 'El Salvador' },
  { prefix: '291', code: 'ER', name: 'Eritrea' },
  { prefix: '251', code: 'ET', name: 'Ethiopia' },
  { prefix: '679', code: 'FJ', name: 'Fiji' },
  { prefix: '298', code: 'FO', name: 'Faroe Islands' },
  { prefix: '241', code: 'GA', name: 'Gabon' },
  { prefix: '995', code: 'GE', name: 'Georgia' },
  { prefix: '299', code: 'GL', name: 'Greenland' },
  { prefix: '220', code: 'GM', name: 'Gambia' },
  { prefix: '224', code: 'GN', name: 'Guinea' },
  { prefix: '240', code: 'GQ', name: 'Equatorial Guinea' },
  { prefix: '502', code: 'GT', name: 'Guatemala' },
  { prefix: '245', code: 'GW', name: 'Guinea-Bissau' },
  { prefix: '592', code: 'GY', name: 'Guyana' },
  { prefix: '504', code: 'HN', name: 'Honduras' },
  { prefix: '385', code: 'HR', name: 'Croatia' },
  { prefix: '509', code: 'HT', name: 'Haiti' },
  { prefix: '852', code: 'HK', name: 'Hong Kong' },
  { prefix: '354', code: 'IS', name: 'Iceland' },
  { prefix: '353', code: 'IE', name: 'Ireland' },
  { prefix: '964', code: 'IQ', name: 'Iraq' },
  { prefix: '972', code: 'IL', name: 'Israel' },
  { prefix: '962', code: 'JO', name: 'Jordan' },
  { prefix: '254', code: 'KE', name: 'Kenya' },
  { prefix: '996', code: 'KG', name: 'Kyrgyzstan' },
  { prefix: '855', code: 'KH', name: 'Cambodia' },
  { prefix: '686', code: 'KI', name: 'Kiribati' },
  { prefix: '269', code: 'KM', name: 'Comoros' },
  { prefix: '850', code: 'KP', name: 'North Korea' },
  { prefix: '965', code: 'KW', name: 'Kuwait' },
  { prefix: '856', code: 'LA', name: 'Laos' },
  { prefix: '961', code: 'LB', name: 'Lebanon' },
  { prefix: '423', code: 'LI', name: 'Liechtenstein' },
  { prefix: '231', code: 'LR', name: 'Liberia' },
  { prefix: '266', code: 'LS', name: 'Lesotho' },
  { prefix: '370', code: 'LT', name: 'Lithuania' },
  { prefix: '352', code: 'LU', name: 'Luxembourg' },
  { prefix: '371', code: 'LV', name: 'Latvia' },
  { prefix: '218', code: 'LY', name: 'Libya' },
  { prefix: '212', code: 'MA', name: 'Morocco' },
  { prefix: '373', code: 'MD', name: 'Moldova' },
  { prefix: '377', code: 'MC', name: 'Monaco' },
  { prefix: '261', code: 'MG', name: 'Madagascar' },
  { prefix: '389', code: 'MK', name: 'North Macedonia' },
  { prefix: '223', code: 'ML', name: 'Mali' },
  { prefix: '853', code: 'MO', name: 'Macao' },
  { prefix: '222', code: 'MR', name: 'Mauritania' },
  { prefix: '356', code: 'MT', name: 'Malta' },
  { prefix: '230', code: 'MU', name: 'Mauritius' },
  { prefix: '960', code: 'MV', name: 'Maldives' },
  { prefix: '265', code: 'MW', name: 'Malawi' },
  { prefix: '258', code: 'MZ', name: 'Mozambique' },
  { prefix: '264', code: 'NA', name: 'Namibia' },
  { prefix: '227', code: 'NE', name: 'Niger' },
  { prefix: '234', code: 'NG', name: 'Nigeria' },
  { prefix: '505', code: 'NI', name: 'Nicaragua' },
  { prefix: '977', code: 'NP', name: 'Nepal' },
  { prefix: '674', code: 'NR', name: 'Nauru' },
  { prefix: '968', code: 'OM', name: 'Oman' },
  { prefix: '507', code: 'PA', name: 'Panama' },
  { prefix: '595', code: 'PY', name: 'Paraguay' },
  { prefix: '974', code: 'QA', name: 'Qatar' },
  { prefix: '250', code: 'RW', name: 'Rwanda' },
  { prefix: '966', code: 'SA', name: 'Saudi Arabia' },
  { prefix: '677', code: 'SB', name: 'Solomon Islands' },
  { prefix: '249', code: 'SD', name: 'Sudan' },
  { prefix: '248', code: 'SC', name: 'Seychelles' },
  { prefix: '221', code: 'SN', name: 'Senegal' },
  { prefix: '252', code: 'SO', name: 'Somalia' },
  { prefix: '378', code: 'SM', name: 'San Marino' },
  { prefix: '386', code: 'SI', name: 'Slovenia' },
  { prefix: '421', code: 'SK', name: 'Slovakia' },
  { prefix: '232', code: 'SL', name: 'Sierra Leone' },
  { prefix: '963', code: 'SY', name: 'Syria' },
  { prefix: '268', code: 'SZ', name: 'Eswatini' },
  { prefix: '235', code: 'TD', name: 'Chad' },
  { prefix: '228', code: 'TG', name: 'Togo' },
  { prefix: '992', code: 'TJ', name: 'Tajikistan' },
  { prefix: '670', code: 'TL', name: 'Timor-Leste' },
  { prefix: '993', code: 'TM', name: 'Turkmenistan' },
  { prefix: '216', code: 'TN', name: 'Tunisia' },
  { prefix: '676', code: 'TO', name: 'Tonga' },
  { prefix: '886', code: 'TW', name: 'Taiwan' },
  { prefix: '255', code: 'TZ', name: 'Tanzania' },
  { prefix: '380', code: 'UA', name: 'Ukraine' },
  { prefix: '256', code: 'UG', name: 'Uganda' },
  { prefix: '598', code: 'UY', name: 'Uruguay' },
  { prefix: '998', code: 'UZ', name: 'Uzbekistan' },
  { prefix: '678', code: 'VU', name: 'Vanuatu' },
  { prefix: '685', code: 'WS', name: 'Samoa' },
  { prefix: '967', code: 'YE', name: 'Yemen' },
  { prefix: '213', code: 'DZ', name: 'Algeria' },
  { prefix: '593', code: 'EC', name: 'Ecuador' },
  { prefix: '372', code: 'EE', name: 'Estonia' },
  { prefix: '351', code: 'PT', name: 'Portugal' },
  { prefix: '359', code: 'BG', name: 'Bulgaria' },
  { prefix: '358', code: 'FI', name: 'Finland' },
  { prefix: '381', code: 'RS', name: 'Serbia' },
  { prefix: '382', code: 'ME', name: 'Montenegro' },
  { prefix: '383', code: 'XK', name: 'Kosovo' },
  { prefix: '20',  code: 'EG', name: 'Egypt' },
  { prefix: '27',  code: 'ZA', name: 'South Africa' },
  { prefix: '30',  code: 'GR', name: 'Greece' },
  { prefix: '31',  code: 'NL', name: 'Netherlands' },
  { prefix: '32',  code: 'BE', name: 'Belgium' },
  { prefix: '33',  code: 'FR', name: 'France' },
  { prefix: '34',  code: 'ES', name: 'Spain' },
  { prefix: '36',  code: 'HU', name: 'Hungary' },
  { prefix: '39',  code: 'IT', name: 'Italy' },
  { prefix: '40',  code: 'RO', name: 'Romania' },
  { prefix: '41',  code: 'CH', name: 'Switzerland' },
  { prefix: '43',  code: 'AT', name: 'Austria' },
  { prefix: '44',  code: 'GB', name: 'United Kingdom' },
  { prefix: '45',  code: 'DK', name: 'Denmark' },
  { prefix: '46',  code: 'SE', name: 'Sweden' },
  { prefix: '47',  code: 'NO', name: 'Norway' },
  { prefix: '48',  code: 'PL', name: 'Poland' },
  { prefix: '49',  code: 'DE', name: 'Germany' },
  { prefix: '51',  code: 'PE', name: 'Peru' },
  { prefix: '52',  code: 'MX', name: 'Mexico' },
  { prefix: '53',  code: 'CU', name: 'Cuba' },
  { prefix: '54',  code: 'AR', name: 'Argentina' },
  { prefix: '55',  code: 'BR', name: 'Brazil' },
  { prefix: '56',  code: 'CL', name: 'Chile' },
  { prefix: '57',  code: 'CO', name: 'Colombia' },
  { prefix: '58',  code: 'VE', name: 'Venezuela' },
  { prefix: '60',  code: 'MY', name: 'Malaysia' },
  { prefix: '61',  code: 'AU', name: 'Australia' },
  { prefix: '62',  code: 'ID', name: 'Indonesia' },
  { prefix: '63',  code: 'PH', name: 'Philippines' },
  { prefix: '64',  code: 'NZ', name: 'New Zealand' },
  { prefix: '65',  code: 'SG', name: 'Singapore' },
  { prefix: '66',  code: 'TH', name: 'Thailand' },
  { prefix: '81',  code: 'JP', name: 'Japan' },
  { prefix: '82',  code: 'KR', name: 'South Korea' },
  { prefix: '84',  code: 'VN', name: 'Vietnam' },
  { prefix: '86',  code: 'CN', name: 'China' },
  { prefix: '90',  code: 'TR', name: 'Turkey' },
  { prefix: '91',  code: 'IN', name: 'India' },
  { prefix: '92',  code: 'PK', name: 'Pakistan' },
  { prefix: '93',  code: 'AF', name: 'Afghanistan' },
  { prefix: '94',  code: 'LK', name: 'Sri Lanka' },
  { prefix: '95',  code: 'MM', name: 'Myanmar' },
  { prefix: '98',  code: 'IR', name: 'Iran' },
  { prefix: '7',   code: 'RU', name: 'Russia' },
  { prefix: '1',   code: 'US', name: 'United States / Canada' },
]

function formatPhone(phone: string | null | undefined): { code: string; name: string; prefix: string; local: string } | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  const sorted = [...COUNTRY_PREFIXES].sort((a, b) => b.prefix.length - a.prefix.length)
  for (const c of sorted) {
    if (digits.startsWith(c.prefix)) {
      return { code: c.code, name: c.name, prefix: c.prefix, local: digits.slice(c.prefix.length) }
    }
  }
  return { code: '??', name: 'Unknown', prefix: '', local: digits }
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createServiceClient()

  // Check admin access (superadmin email or in admins table)
  const { data: adminRow } = await admin.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (user.email !== SUPERADMIN_EMAIL && !adminRow) redirect('/dashboard')

  const [
    { data: authData },
    { data: subscriptions },
    { data: adminsList },
    { count: projectCount },
    { count: clipCount },
    { count: exportCount },
  ] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from('subscriptions').select('user_id, plan, exports_used, created_at').order('created_at', { ascending: false }),
    admin.from('admins').select('user_id'),
    admin.from('projects').select('*', { count: 'exact', head: true }),
    admin.from('clips').select('*', { count: 'exact', head: true }),
    admin.from('exports').select('*', { count: 'exact', head: true }),
  ])

  const adminUserIds = new Set((adminsList ?? []).map(a => a.user_id))
  const isSuperadmin = user.email === SUPERADMIN_EMAIL

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
                  {['Email', 'Phone', 'Plan', 'Exports Used', 'Joined', 'Change Plan', 'Admin', 'Delete'].map(h => (
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
                  const userIsAdmin = adminUserIds.has(u.id) || u.email === SUPERADMIN_EMAIL
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 16px', color: '#E9D5FF' }}>{u.email}</td>
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const fp = formatPhone(u.phone)
                          if (!fp) return <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>—</span>
                          return (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span
                                title={fp.name}
                                style={{ color: '#A855F7', fontSize: 10, fontWeight: 700, cursor: 'default', borderBottom: '1px dotted rgba(168,85,247,0.4)' }}
                              >
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
                        {u.email === SUPERADMIN_EMAIL ? (
                          <span style={{ fontSize: 11, color: '#A855F7', fontWeight: 700 }}>Superadmin</span>
                        ) : isSuperadmin ? (
                          <AdminToggleButton userId={u.id} isAdmin={userIsAdmin} />
                        ) : (
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {u.email === SUPERADMIN_EMAIL ? (
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>—</span>
                        ) : (
                          <AdminDeleteButton userId={u.id} email={u.email ?? ''} />
                        )}
                      </td>
                    </tr>
                  )
                })}
                {recentUsers.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
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
