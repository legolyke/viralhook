'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface UpsellModalProps {
  plan: string
  exportsUsed: number
  limit: number
  onClose: () => void
}

const UPSELL_PLANS = [
  { name: 'CREATOR', price: '€19', exports: '40 exports/month', planKey: 'creator' },
  { name: 'PRO', price: '€49', exports: '150 exports/month', planKey: 'pro' },
]

export default function UpsellModal({ plan, exportsUsed, limit, onClose }: UpsellModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleUpgrade(planKey: string) {
    setLoading(planKey)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      const data = await res.json()
      if (data.url) router.push(data.url)
    } catch {
      setLoading(null)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: '#111', border: '1px solid #222', borderRadius: '16px',
        padding: '32px', width: '100%', maxWidth: '480px',
        boxShadow: '0 0 60px rgba(168,85,247,0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <span style={{ fontSize: '24px' }}>⚡</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '20px' }}>×</button>
        </div>

        <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: '0 0 6px' }}>
          You&apos;ve reached your limit
        </h2>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
          You&apos;ve used <strong style={{ color: '#fff' }}>{exportsUsed}/{limit}</strong> exports this month on the <strong style={{ color: '#A855F7' }}>{plan.toUpperCase()}</strong> plan.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          {UPSELL_PLANS.map(p => (
            <div key={p.planKey} style={{
              background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px',
              padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <div style={{ color: '#A855F7', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em' }}>{p.name}</div>
              <div style={{ color: '#fff', fontSize: '24px', fontWeight: 800 }}>{p.price}<span style={{ fontSize: '13px', color: '#666' }}>/mo</span></div>
              <div style={{ color: '#aaa', fontSize: '13px' }}>{p.exports}</div>
              <button
                onClick={() => handleUpgrade(p.planKey)}
                disabled={!!loading}
                style={{
                  marginTop: '8px', padding: '10px', background: 'linear-gradient(135deg,#7C3AED,#C026D3)',
                  border: 'none', borderRadius: '8px', color: '#fff',
                  fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading === p.planKey ? 'Redirecting...' : 'Upgrade →'}
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '12px', background: 'none',
            border: '1px solid #222', borderRadius: '10px',
            color: '#666', fontSize: '14px', cursor: 'pointer',
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
