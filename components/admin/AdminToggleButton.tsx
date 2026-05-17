'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminToggleButton({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState(isAdmin)

  async function toggle() {
    if (!confirm(current ? 'Remove admin rights for this user?' : 'Grant admin rights to this user?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/admin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant: !current }),
      })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setCurrent(v => !v)
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      style={{
        padding: '4px 12px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        cursor: loading ? 'wait' : 'pointer',
        border: `1px solid ${current ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.1)'}`,
        background: current ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)',
        color: current ? '#C084FC' : 'rgba(255,255,255,0.35)',
      }}
    >
      {loading ? '...' : current ? 'Admin ✓' : 'Grant'}
    </button>
  )
}
