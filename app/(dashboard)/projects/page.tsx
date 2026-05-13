import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import EmptyState from '@/components/dashboard/EmptyState'
import PageHeader from '@/components/dashboard/PageHeader'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, status, created_at, source')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="dashboard-content" style={{ maxWidth: 1200 }}>
      <PageHeader breadcrumb="Projects" title="Projects" description="All your video projects." />

      {!projects || projects.length === 0 ? (
        <EmptyState
          icon={<span style={{ fontSize: 20 }}>🎬</span>}
          title="No projects yet"
          description="Upload your first video to get started."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(168,85,247,0.1)',
                borderRadius: 12,
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                textDecoration: 'none',
                transition: 'border-color 0.15s',
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
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
