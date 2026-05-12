import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'

export default function BillingPage() {
  return (
    <div style={{ padding: '28px 28px 40px' }}>
      <PageHeader
        title="Billing"
        breadcrumb="Dashboard / Billing"
        description="Manage your subscription and payment details."
      />
      <EmptyState
        icon={
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="rgba(168,85,247,0.6)" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
          </svg>
        }
        title="Coming soon"
        description="Subscription plans and billing will be available here."
      />
    </div>
  )
}
