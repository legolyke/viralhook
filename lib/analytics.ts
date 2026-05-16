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
