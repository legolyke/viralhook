import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'

export default function ProjectsPage() {
  return (
    <div style={{ padding: '28px 28px 40px' }}>
      <PageHeader
        title="Projects"
        breadcrumb="Dashboard / Projects"
        description="All your video projects and generated clips."
      />
      <EmptyState
        icon={
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="rgba(168,85,247,0.6)" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
          </svg>
        }
        title="Coming soon"
        description="Your processed videos and generated clips will appear here."
      />
    </div>
  )
}
