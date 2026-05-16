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
    <div className="dashboard-content">
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
