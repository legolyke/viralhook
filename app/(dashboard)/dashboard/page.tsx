import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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

  const firstName = user.email?.split('@')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200 }}>
      <PageHeader
        title={`${greeting}, ${firstName} 👋`}
        description="Create viral shorts from your long-form content."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, margin: '32px 0' }}>
        <StatsCard label="Exports used" value={0} limit={3} unit="exports" />
        <StatsCard label="Video processed" value={0} limit={30} unit="min" />
        <StatsCard label="Projects" value={projects?.length ?? 0} />
        <StatsCard label="Plan" value="FREE" />
      </div>

      <DashboardUploadTrigger />

      <div style={{ marginTop: 40 }}>
        <h3 style={{ color: '#E9D5FF', fontWeight: 600, fontSize: 16, marginBottom: 16 }}>
          Recent Projects
        </h3>
        {!projects || projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Upload your first video to get started."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {projects.map((p) => (
              <div
                key={p.id}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(168,85,247,0.1)',
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ color: '#E9D5FF', fontWeight: 500, margin: 0 }}>{p.title}</p>
                  <p style={{ color: '#6B7280', fontSize: 12, margin: '4px 0 0' }}>
                    {p.source === 'youtube' ? '📺 YouTube' : p.source === 'tiktok' ? '🎵 TikTok' : '📁 File'} ·{' '}
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span style={{
                  fontSize: 12,
                  padding: '4px 10px',
                  borderRadius: 20,
                  background: p.status === 'ready' ? 'rgba(34,197,94,0.1)' :
                               p.status === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(168,85,247,0.1)',
                  color: p.status === 'ready' ? '#4ADE80' :
                         p.status === 'error' ? '#F87171' : '#C084FC',
                }}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
