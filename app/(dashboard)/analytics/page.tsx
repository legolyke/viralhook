import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'

export default function AnalyticsPage() {
  return (
    <div style={{ padding: '28px 28px 40px' }}>
      <PageHeader
        title="Analytics"
        breadcrumb="Dashboard / Analytics"
        description="Track performance and virality scores for your clips."
      />
      <EmptyState
        icon={
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="rgba(168,85,247,0.6)" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
        }
        title="Coming soon"
        description="Analytics will be available once you start creating clips."
      />
    </div>
  )
}
