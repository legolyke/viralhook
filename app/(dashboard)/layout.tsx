import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { isAdmin } from '@/lib/is-admin'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: sub }, adminFlag] = await Promise.all([
    supabase.from('subscriptions').select('plan').eq('user_id', user.id).single(),
    isAdmin(user.id, user.email),
  ])

  const plan = (sub?.plan ?? 'free') as import('@/lib/plans').PlanName

  return (
    <div className="dashboard-layout">
      <Sidebar
          email={user.email ?? ''}
          fullName={user.user_metadata?.full_name ?? user.user_metadata?.name}
          plan={plan}
          isAdmin={adminFlag}
        />
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  )
}
