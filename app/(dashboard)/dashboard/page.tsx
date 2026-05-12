'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setEmail(user.email ?? null)
    })
  }, [])

  async function handleLogout() {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', margin: 0 }}>
          Viral<span style={{ color: '#A855F7' }}>Hook</span> Dashboard
        </h1>
        {email && (
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            Welcome, <span style={{ color: '#ffffff' }}>{email}</span>
          </p>
        )}
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', margin: 0 }}>Module 2 — Dashboard UI coming soon</p>
        <button
          onClick={handleLogout}
          disabled={loading}
          style={{
            marginTop: 8,
            padding: '10px 24px',
            borderRadius: 10,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171',
            fontSize: 14,
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    </div>
  )
}
