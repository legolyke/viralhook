'use client'

import { useState } from 'react'

export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function openPortal() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      window.location.href = data.url!
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open billing portal')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={openPortal}
        disabled={loading}
        style={{
          padding: '10px 20px', borderRadius: 10,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.7), rgba(192,38,211,0.7))',
          border: 'none', color: '#fff', fontSize: 13, fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer',
        }}
      >
        {loading ? 'Opening…' : 'Manage Subscription'}
      </button>
      {error && <p style={{ color: '#F87171', fontSize: 12, marginTop: 8 }}>{error}</p>}
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 8 }}>
        Cancel, change plan, or update payment method — your plan stays active until end of billing period.
      </p>
    </div>
  )
}
