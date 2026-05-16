import PageHeader from '@/components/dashboard/PageHeader'
import ConnectedAccounts from '@/components/settings/ConnectedAccounts'
import { Suspense } from 'react'

export default function SettingsPage() {
  return (
    <div style={{ padding: '28px 28px 40px', maxWidth: 600 }}>
      <PageHeader
        title="Settings"
        breadcrumb="Dashboard / Settings"
        description="Account preferences and connected integrations."
      />

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
          Connected Accounts
        </h2>
        <Suspense fallback={null}>
          <ConnectedAccounts />
        </Suspense>
      </section>
    </div>
  )
}
