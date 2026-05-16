# Analytics Dashboard + Admin Panel (Module 13) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a user analytics page at /analytics (stat cards, exports chart, top clips) and an /admin panel (users, revenue, activity) protected by email check.

**Architecture:** Server Components with direct Supabase queries — no new API routes. User analytics uses the authenticated user's session (RLS applies). Admin panel uses `createServiceClient()` (service role, bypasses RLS). Admin email guard in middleware + page.

**Tech Stack:** TypeScript, Next.js App Router (Server Components), Supabase, Vitest

---

## File Map

| File | Change |
|------|--------|
| `lib/analytics.ts` | Create: typed query functions + SVG chart builder |
| `tests/lib/analytics.test.ts` | Create: unit tests |
| `app/(dashboard)/analytics/page.tsx` | Modify: replace placeholder |
| `app/(dashboard)/admin/page.tsx` | Create: admin panel |
| `middleware.ts` | Modify: add /admin session guard |
| `components/dashboard/Sidebar.tsx` | Modify: Admin nav link for owner only |

---

## Task 1: lib/analytics.ts — types, query functions, SVG chart + tests

**Files:**
- Create: `lib/analytics.ts`
- Create: `tests/lib/analytics.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/lib/analytics.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import {
  getUserStats,
  getExportsByDay,
  getTopClips,
  getPlatformUserStats,
  getPlatformActivityStats,
  buildBarChartSvg,
} from '@/lib/analytics'

function makeChain(finalValue: unknown = { data: null, error: null, count: 0 }) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'gte', 'order', 'limit', 'in', 'single']
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  // terminal resolvers
  ;(chain['single'] as ReturnType<typeof vi.fn>).mockResolvedValue(finalValue)
  ;(chain['limit'] as ReturnType<typeof vi.fn>).mockResolvedValue(finalValue)
  ;(chain['in'] as ReturnType<typeof vi.fn>).mockResolvedValue(finalValue)
  ;(chain['gte'] as ReturnType<typeof vi.fn>).mockResolvedValue(finalValue)
  return chain
}

function makeSupabase(finalValue: unknown = { data: null, error: null, count: 0 }) {
  const chain = makeChain(finalValue)
  return {
    from: vi.fn().mockReturnValue(chain),
    _chain: chain,
  }
}

describe('getUserStats', () => {
  it('returns zeros when no data', async () => {
    const sb = makeSupabase({ data: null, error: null, count: 0 })
    const result = await getUserStats(sb as never, 'user-1')
    expect(result.projectCount).toBe(0)
    expect(result.clipCount).toBe(0)
    expect(result.exportsUsed).toBe(0)
    expect(result.avgViralityScore).toBeNull()
  })
})

describe('getExportsByDay', () => {
  it('returns empty array when no exports', async () => {
    const sb = makeSupabase({ data: [], error: null })
    const result = await getExportsByDay(sb as never, 'user-1', 30)
    expect(result).toEqual([])
  })
})

describe('getTopClips', () => {
  it('returns empty array when no clips', async () => {
    const sb = makeSupabase({ data: [], error: null })
    const result = await getTopClips(sb as never, 'user-1', 3)
    expect(result).toEqual([])
  })
})

describe('getPlatformUserStats', () => {
  it('returns zeros when no data', async () => {
    const sb = makeSupabase({ data: [], error: null, count: 0 })
    const result = await getPlatformUserStats(sb as never)
    expect(result.totalUsers).toBe(0)
    expect(result.byPlan.free).toBe(0)
    expect(result.mrr).toBe(0)
    expect(result.arr).toBe(0)
  })
})

describe('getPlatformActivityStats', () => {
  it('returns zeros when no data', async () => {
    const sb = makeSupabase({ data: [], error: null, count: 0 })
    const result = await getPlatformActivityStats(sb as never)
    expect(result.totalProjects).toBe(0)
    expect(result.totalClips).toBe(0)
    expect(result.totalExports).toBe(0)
  })
})

describe('buildBarChartSvg', () => {
  it('returns a valid SVG string for normal data', () => {
    const data = [
      { date: '2026-05-01', count: 3 },
      { date: '2026-05-02', count: 5 },
      { date: '2026-05-03', count: 0 },
    ]
    const svg = buildBarChartSvg(data)
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
    expect(svg).toContain('<rect')
  })

  it('handles all-zero data without dividing by zero', () => {
    const data = [{ date: '2026-05-01', count: 0 }]
    const svg = buildBarChartSvg(data)
    expect(svg).toContain('<svg')
  })

  it('returns empty string when data is empty', () => {
    const svg = buildBarChartSvg([])
    expect(svg).toBe('')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```
npx vitest run tests/lib/analytics.test.ts
```
Expected: all 8 tests FAIL with "Cannot find module '@/lib/analytics'".

- [ ] **Step 3: Create lib/analytics.ts**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import { PLAN_LIMITS } from '@/lib/plans'
import type { PlanName } from '@/lib/plans'

export interface UserStats {
  projectCount: number
  clipCount: number
  exportsUsed: number
  exportLimit: number
  avgViralityScore: number | null
}

export interface DayCount {
  date: string
  count: number
}

export interface TopClip {
  id: string
  title: string
  virality_score: number
  start_time: number
  end_time: number
  project_id: string
  project_title: string | null
}

export interface PlatformUserStats {
  totalUsers: number
  byPlan: Record<PlanName, number>
  newToday: number
  newThisWeek: number
  newThisMonth: number
  mrr: number
  arr: number
}

export interface PlatformActivityStats {
  totalProjects: number
  totalClips: number
  totalExports: number
  projectsToday: number
  projectsThisWeek: number
}

export async function getUserStats(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserStats> {
  const [projectsRes, clipsRes, subRes] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('clips').select('virality_score').eq('user_id', userId),
    supabase.from('subscriptions').select('plan, exports_used').eq('user_id', userId).single(),
  ])

  const projectCount = projectsRes.count ?? 0
  const clips = (clipsRes.data ?? []) as { virality_score: number }[]
  const scores = clips
    .map(c => c.virality_score)
    .filter((s): s is number => typeof s === 'number' && s >= 0)
  const avgViralityScore = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
    : null
  const plan = ((subRes.data as { plan?: string } | null)?.plan ?? 'free') as PlanName
  return {
    projectCount,
    clipCount: clips.length,
    exportsUsed: (subRes.data as { exports_used?: number } | null)?.exports_used ?? 0,
    exportLimit: PLAN_LIMITS[plan],
    avgViralityScore,
  }
}

export async function getExportsByDay(
  supabase: SupabaseClient,
  userId: string,
  days: number = 30,
): Promise<DayCount[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data } = await supabase
    .from('clips')
    .select('updated_at')
    .eq('user_id', userId)
    .eq('status', 'ready')
    .gte('updated_at', since.toISOString())

  if (!data || (data as unknown[]).length === 0) return []

  const counts: Record<string, number> = {}
  for (const row of data as { updated_at: string }[]) {
    const date = row.updated_at.slice(0, 10)
    counts[date] = (counts[date] ?? 0) + 1
  }

  const result: DayCount[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    result.push({ date: key, count: counts[key] ?? 0 })
  }
  return result
}

export async function getTopClips(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 3,
): Promise<TopClip[]> {
  const { data } = await supabase
    .from('clips')
    .select('id, title, virality_score, start_time, end_time, project_id')
    .eq('user_id', userId)
    .order('virality_score', { ascending: false })
    .limit(limit)

  if (!data || (data as unknown[]).length === 0) return []

  const typedData = data as {
    id: string; title: string; virality_score: number
    start_time: number; end_time: number; project_id: string
  }[]

  const projectIds = [...new Set(typedData.map(c => c.project_id))]
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title')
    .in('id', projectIds)

  const projectMap = Object.fromEntries(
    ((projects ?? []) as { id: string; title: string }[]).map(p => [p.id, p.title])
  )

  return typedData.map(c => ({
    id: c.id,
    title: c.title,
    virality_score: c.virality_score,
    start_time: c.start_time,
    end_time: c.end_time,
    project_id: c.project_id,
    project_title: projectMap[c.project_id] ?? null,
  }))
}

export async function getPlatformUserStats(
  supabase: SupabaseClient,
): Promise<PlatformUserStats> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [totalRes, plansRes, todayRes, weekRes, monthRes] = await Promise.all([
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('plan'),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
  ])

  const byPlan: Record<PlanName, number> = { free: 0, creator: 0, pro: 0, agency: 0 }
  for (const row of (plansRes.data ?? []) as { plan: string }[]) {
    const p = (row.plan ?? 'free') as PlanName
    if (p in byPlan) byPlan[p]++
  }

  const mrr = byPlan.creator * 19 + byPlan.pro * 49 + byPlan.agency * 149
  return {
    totalUsers: totalRes.count ?? 0,
    byPlan,
    newToday: todayRes.count ?? 0,
    newThisWeek: weekRes.count ?? 0,
    newThisMonth: monthRes.count ?? 0,
    mrr,
    arr: mrr * 12,
  }
}

export async function getPlatformActivityStats(
  supabase: SupabaseClient,
): Promise<PlatformActivityStats> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [projRes, clipsRes, exportsRes, projTodayRes, projWeekRes] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }),
    supabase.from('clips').select('id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('exports_used'),
    supabase.from('projects').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('projects').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
  ])

  const totalExports = ((exportsRes.data ?? []) as { exports_used: number }[])
    .reduce((sum, row) => sum + (row.exports_used ?? 0), 0)

  return {
    totalProjects: projRes.count ?? 0,
    totalClips: clipsRes.count ?? 0,
    totalExports,
    projectsToday: projTodayRes.count ?? 0,
    projectsThisWeek: projWeekRes.count ?? 0,
  }
}

export function buildBarChartSvg(data: DayCount[]): string {
  if (data.length === 0) return ''
  const W = 600
  const H = 100
  const max = Math.max(...data.map(d => d.count), 1)
  const barW = Math.max(1, Math.floor(W / data.length) - 2)
  const bars = data
    .map((d, i) => {
      const h = Math.round((d.count / max) * H)
      const x = i * (barW + 2)
      const y = H - h
      return `<rect x="${x}" y="${y}" width="${barW}" height="${Math.max(h, 1)}" fill="rgba(168,85,247,0.6)" rx="2"/>`
    })
    .join('')
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${bars}</svg>`
}
```

- [ ] **Step 4: Run tests**

```
npx vitest run tests/lib/analytics.test.ts
```
Expected: all 8 tests pass.

- [ ] **Step 5: TypeScript check**

```
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```
git add lib/analytics.ts tests/lib/analytics.test.ts
git commit -m "feat(module13): analytics query functions + SVG chart builder"
```

---

## Task 2: User analytics page

**Files:**
- Modify: `app/(dashboard)/analytics/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Replace analytics/page.tsx**

Replace the entire file with:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/dashboard/PageHeader'
import { getUserStats, getExportsByDay, getTopClips, buildBarChartSvg } from '@/lib/analytics'

function formatDuration(startMs: number, endMs: number): string {
  return `${Math.round((endMs - startMs) / 1000)}s`
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [stats, exportsByDay, topClips] = await Promise.all([
    getUserStats(supabase, user.id),
    getExportsByDay(supabase, user.id, 30),
    getTopClips(supabase, user.id, 3),
  ])

  const scoreColor = stats.avgViralityScore === null
    ? 'rgba(255,255,255,0.3)'
    : stats.avgViralityScore >= 0.8 ? '#4ADE80'
    : stats.avgViralityScore >= 0.6 ? '#FCD34D'
    : '#C084FC'

  const chartSvg = buildBarChartSvg(exportsByDay)

  const statCards = [
    { label: 'Videos Uploaded', value: String(stats.projectCount), color: '#E9D5FF' },
    { label: 'Clips Generated', value: String(stats.clipCount), color: '#E9D5FF' },
    { label: 'Exports Used', value: `${stats.exportsUsed} / ${stats.exportLimit}`, color: '#E9D5FF' },
    {
      label: 'Avg Virality Score',
      value: stats.avgViralityScore !== null ? `${Math.round(stats.avgViralityScore * 100)}%` : '—',
      color: scoreColor,
    },
  ]

  return (
    <div style={{ padding: '28px 28px 40px' }}>
      <PageHeader
        title="Analytics"
        breadcrumb="Dashboard / Analytics"
        description="Track performance and virality scores for your clips."
      />

      {/* Stat cards */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}
        className="analytics-cards"
      >
        {statCards.map(card => (
          <div
            key={card.label}
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(168,85,247,0.15)',
              borderRadius: 12,
              padding: '16px 20px',
            }}
          >
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              {card.label}
            </div>
            <div style={{ color: card.color, fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Exports chart */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(168,85,247,0.15)',
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 28,
      }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
          Exports — Last 30 Days
        </div>
        {chartSvg ? (
          <div style={{ height: 100 }} dangerouslySetInnerHTML={{ __html: chartSvg }} />
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, margin: 0, textAlign: 'center', padding: '20px 0' }}>
            No exports yet
          </p>
        )}
      </div>

      {/* Top clips */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(168,85,247,0.15)',
        borderRadius: 12,
        padding: '20px 24px',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
          Top Clips by Virality Score
        </div>
        {topClips.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, margin: 0, textAlign: 'center', padding: '20px 0' }}>
            No clips yet — upload a video to get started
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topClips.map(clip => {
              const color = clip.virality_score >= 0.8 ? '#4ADE80'
                : clip.virality_score >= 0.6 ? '#FCD34D' : '#C084FC'
              const bg = clip.virality_score >= 0.8 ? 'rgba(34,197,94,0.1)'
                : clip.virality_score >= 0.6 ? 'rgba(234,179,8,0.1)' : 'rgba(168,85,247,0.1)'
              return (
                <Link
                  key={clip.id}
                  href={`/projects/${clip.project_id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ background: bg, color, borderRadius: 20, fontSize: 12, fontWeight: 700, padding: '2px 10px', flexShrink: 0 }}>
                    {Math.round(clip.virality_score * 100)}%
                  </span>
                  <span style={{ color: '#E9D5FF', fontSize: 13, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {clip.title}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, flexShrink: 0 }}>
                    {formatDuration(clip.start_time, clip.end_time)}
                  </span>
                  {clip.project_title && (
                    <span style={{ color: 'rgba(168,85,247,0.6)', fontSize: 11, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                      {clip.project_title}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add responsive CSS**

At the end of `app/globals.css`, add:

```css
@media (max-width: 768px) {
  .analytics-cards {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}
@media (max-width: 480px) {
  .analytics-cards {
    grid-template-columns: 1fr !important;
  }
}
```

- [ ] **Step 3: TypeScript check**

```
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```
git add "app/(dashboard)/analytics/page.tsx" app/globals.css
git commit -m "feat(module13): user analytics page with stats, chart, top clips"
```

---

## Task 3: Admin page + middleware guard

**Files:**
- Create: `app/(dashboard)/admin/page.tsx`
- Modify: `middleware.ts`

- [ ] **Step 1: Update middleware.ts**

Replace the full file content with:

```typescript
import { NextResponse, type NextRequest } from 'next/server'

const PROJECT_REF = 'qkkltpkbfsotgxcgkbme'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession =
    request.cookies.has(`sb-${PROJECT_REF}-auth-token`) ||
    request.cookies.has(`sb-${PROJECT_REF}-auth-token.0`)

  if (!hasSession && (pathname.startsWith('/dashboard') || pathname.startsWith('/projects'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (hasSession && (pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (pathname.startsWith('/admin') && !hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

Note: The email check (popescu2290@gmail.com) is enforced server-side in the admin page itself via `supabase.auth.getUser()`. Middleware only handles unauthenticated redirect since it cannot verify email from cookies alone.

- [ ] **Step 2: Create app/(dashboard)/admin/page.tsx**

```typescript
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PageHeader from '@/components/dashboard/PageHeader'
import { getPlatformUserStats, getPlatformActivityStats } from '@/lib/analytics'
import type { PlanName } from '@/lib/plans'

const ADMIN_EMAIL = 'popescu2290@gmail.com'

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '9px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{label}</span>
      <span style={{ color: '#E9D5FF', fontSize: 13, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(168,85,247,0.15)',
      borderRadius: 12,
      padding: '20px 24px',
      marginBottom: 20,
    }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) redirect('/dashboard')

  const serviceClient = createServiceClient()
  const [userStats, activityStats] = await Promise.all([
    getPlatformUserStats(serviceClient),
    getPlatformActivityStats(serviceClient),
  ])

  const planPrices: Record<PlanName, number> = { free: 0, creator: 19, pro: 49, agency: 149 }
  const plans: PlanName[] = ['free', 'creator', 'pro', 'agency']

  return (
    <div style={{ padding: '28px 28px 40px', maxWidth: 900 }}>
      <PageHeader
        title="Admin Panel"
        breadcrumb="Dashboard / Admin"
        description="Platform-wide metrics and reporting."
      />

      {/* Users */}
      <Section title="Users">
        <StatRow label="Total Users" value={userStats.totalUsers} />
        <StatRow label="New Today" value={userStats.newToday} />
        <StatRow label="New This Week" value={userStats.newThisWeek} />
        <StatRow label="New This Month (30d)" value={userStats.newThisMonth} />
      </Section>

      {/* Plans & Revenue */}
      <Section title="Plans & Revenue">
        <StatRow label="MRR (estimated)" value={`€${userStats.mrr.toLocaleString()}`} />
        <StatRow label="ARR (estimated)" value={`€${userStats.arr.toLocaleString()}`} />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 16 }}>
          <thead>
            <tr>
              {['Plan', 'Users', 'Price/mo', 'Revenue/mo'].map(h => (
                <th key={h} style={{
                  textAlign: 'left',
                  color: 'rgba(255,255,255,0.35)',
                  fontWeight: 600,
                  paddingBottom: 8,
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plans.map(plan => {
              const count = userStats.byPlan[plan] ?? 0
              const price = planPrices[plan]
              const revenue = count * price
              return (
                <tr key={plan}>
                  <td style={{ padding: '8px 0', color: '#E9D5FF', fontWeight: 600, textTransform: 'capitalize' }}>{plan}</td>
                  <td style={{ padding: '8px 0', color: 'rgba(255,255,255,0.7)' }}>{count}</td>
                  <td style={{ padding: '8px 0', color: 'rgba(255,255,255,0.7)' }}>{price === 0 ? '—' : `€${price}`}</td>
                  <td style={{ padding: '8px 0', color: revenue > 0 ? '#4ADE80' : 'rgba(255,255,255,0.3)' }}>
                    {revenue === 0 ? '—' : `€${revenue.toLocaleString()}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Section>

      {/* Activity */}
      <Section title="Platform Activity">
        <StatRow label="Total Projects Created" value={activityStats.totalProjects} />
        <StatRow label="Total Clips Generated" value={activityStats.totalClips} />
        <StatRow label="Total Exports Performed" value={activityStats.totalExports} />
        <StatRow label="Projects Created Today" value={activityStats.projectsToday} />
        <StatRow label="Projects Created This Week" value={activityStats.projectsThisWeek} />
      </Section>
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check**

```
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```
git add middleware.ts "app/(dashboard)/admin/page.tsx"
git commit -m "feat(module13): admin panel + middleware guard"
```

---

## Task 4: Sidebar admin link

**Files:**
- Modify: `components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Add admin link after NAV_BOTTOM.map block**

In `components/dashboard/Sidebar.tsx`, find this block (around line 243):

```tsx
          {NAV_BOTTOM.map(item => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname === item.href}
              onClick={() => setOpen(false)}
            />
          ))}
```

Replace it with:

```tsx
          {NAV_BOTTOM.map(item => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname === item.href}
              onClick={() => setOpen(false)}
            />
          ))}

          {email === 'popescu2290@gmail.com' && (
            <NavLink
              href="/admin"
              label="Admin"
              icon={
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              }
              active={pathname === '/admin'}
              onClick={() => setOpen(false)}
            />
          )}
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Run all tests**

```
npx vitest run
```
Expected: 8 new analytics tests pass + all previous tests pass (the 1 pre-existing failure in clips-export.test.ts is unrelated).

- [ ] **Step 4: Commit and push**

```
git add components/dashboard/Sidebar.tsx
git commit -m "feat(module13): admin link in sidebar for owner"
git push origin main
```

---

## Task 5: Verify in app

- [ ] **Step 1: Verify analytics page**

Open `/analytics` — confirm 4 stat cards visible, chart section present (empty state "No exports yet" if no data), Top Clips section visible.

- [ ] **Step 2: Verify admin panel**

Log in as `popescu2290@gmail.com` → navigate to `/admin` → confirm Users / Plans & Revenue / Platform Activity sections load with real data.

- [ ] **Step 3: Verify access control**

Log in as any other account → manually navigate to `/admin` → should redirect to `/dashboard`.

- [ ] **Step 4: Verify sidebar**

Admin link appears in sidebar only when logged in as `popescu2290@gmail.com`. Not visible to other users.
