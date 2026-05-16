import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StatsCard from '@/components/dashboard/StatsCard'
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'
import DashboardUploadTrigger from '@/components/dashboard/DashboardUploadTrigger'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, status, created_at, source')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const firstName = user.user_metadata?.full_name
    ?? user.user_metadata?.name
    ?? user.email?.split('@')[0]
    ?? 'there'
  const greeting = 'Hello'

  return (
    <div className="dashboard-content"  style={{ maxWidth: 1200 }}>
      <PageHeader
        breadcrumb="Dashboard"
        title={`${greeting}, ${firstName} 👋`}
        description="Create viral shorts from your long-form content."
      />

      <div className="dashboard-stats-grid" style={{ margin: '32px 0' }}>
        <StatsCard label="Exports used" value={0} limit={3} unit="exports" />
        <StatsCard label="Video processed" value={0} limit={30} unit="min" />
        <StatsCard label="Projects" value={projects?.length ?? 0} />
        <div style={{ padding: '18px 20px', borderRadius: 16, background: '#111114', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Plan</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#22D3EE', letterSpacing: '-0.5px' }}>FREE</div>
        </div>
      </div>

      <DashboardUploadTrigger />

      <div style={{ marginTop: 40 }}>
        <h3 style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: 14, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Recent Projects
        </h3>
        {!projects || projects.length === 0 ? (
          <EmptyState
            icon={<span style={{ fontSize: 20 }}>🎬</span>}
            title="No projects yet"
            description="Upload your first video to get started."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="project-card"
              >
                <div>
                  <p style={{ color: '#fff', fontWeight: 500, margin: 0, fontSize: 14 }}>{p.title}</p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '4px 0 0' }}>
                    {p.source === 'youtube' ? '📺 YouTube' : p.source === 'tiktok' ? '🎵 TikTok' : '📁 File'} ·{' '}
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span style={{
                  fontSize: 11,
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontWeight: 500,
                  background: p.status === 'ready' ? 'rgba(34,211,238,0.08)' :
                               p.status === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(139,92,246,0.08)',
                  color: p.status === 'ready' ? '#22D3EE' :
                         p.status === 'error' ? '#F87171' : '#8B5CF6',
                  border: `1px solid ${p.status === 'ready' ? 'rgba(34,211,238,0.2)' : p.status === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(139,92,246,0.2)'}`,
                }}>
                  {p.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
