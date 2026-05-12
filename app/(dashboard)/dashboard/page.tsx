import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-white">
          Viral<span className="text-purple-500">Hook</span> Dashboard
        </h1>
        <p className="text-zinc-400">
          Bine ai venit, <span className="text-white">{user.email}</span>
        </p>
        <p className="text-sm text-zinc-600">Modul 2 — Dashboard UI urmează</p>
      </div>
    </div>
  )
}
