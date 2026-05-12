import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UploadZone from '@/components/dashboard/UploadZone'
import StatsCard from '@/components/dashboard/StatsCard'
import EmptyState from '@/components/dashboard/EmptyState'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ padding: '28px 28px 40px', maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{greeting}! 👋</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Ready to create something viral today?</p>
      </div>

      <UploadZone />

      <div className="dashboard-stats-grid">
        <StatsCard label="Exports left" value={3} limit={3} />
        <StatsCard label="Minutes left" value={30} limit={30} unit="min" />
        <StatsCard label="Clips created" value={0} />
        <StatsCard label="Videos uploaded" value={0} />
      </div>

      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: '0 0 10px' }}>Recent projects</p>
        <EmptyState
          icon={
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="rgba(168,85,247,0.6)" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
            </svg>
          }
          title="No projects yet"
          description="Upload your first video above to get started"
        />
      </div>
    </div>
  )
}
