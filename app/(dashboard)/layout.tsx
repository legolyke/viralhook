import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="dashboard-layout">
      <Sidebar email={user.email ?? ''} plan="FREE" />
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  )
}
