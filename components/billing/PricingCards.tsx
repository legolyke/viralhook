'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PlanName } from '@/lib/plans'

interface PricingCardsProps {
  currentPlan: PlanName
  exportsUsed: number
}

const PLANS = [
  {
    key: 'free' as PlanName,
    label: 'FREE',
    price: '€0',
    period: '',
    exports: '3 exports/month',
    maxExports: 3,
    features: ['1080p export', 'AI clip detection', 'AI captions'],
    cta: null as string | null,
  },
  {
    key: 'creator' as PlanName,
    label: 'CREATOR',
    price: '€19',
    period: '/month',
    exports: '40 exports/month',
    maxExports: 40,
    features: ['1080p export', 'AI clip detection', 'AI captions', 'Priority support'],
    cta: 'creator' as string | null,
  },
  {
    key: 'pro' as PlanName,
    label: 'PRO',
    price: '€49',
    period: '/month',
    exports: '150 exports/month',
    maxExports: 150,
    features: ['1080p export', 'AI clip detection', 'AI captions', 'Analytics', 'Priority rendering'],
    cta: 'pro' as string | null,
  },
  {
    key: 'agency' as PlanName,
    label: 'AGENCY',
    price: '€149',
    period: '/month',
    exports: '2000 exports/month',
    maxExports: 2000,
    features: ['1080p export', 'AI clip detection', 'AI captions', 'Analytics', 'Team members', 'Priority support'],
    cta: 'agency' as string | null,
  },
]

export default function PricingCards({ currentPlan, exportsUsed }: PricingCardsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpgrade(planKey: string) {
    setLoading(planKey)
    setError(null)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to start checkout')
        return
      }
      if (data.url) router.push(data.url)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  async function handleManage() {
    setLoading('portal')
    setError(null)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to open billing portal')
        return
      }
      if (data.url) router.push(data.url)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '10px', padding: '12px 16px', marginBottom: '16px',
          color: '#fca5a5', fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      <div className="pricing-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: '16px',
        alignItems: 'stretch',
      }}>
        {PLANS.map(plan => {
          const isCurrent = plan.key === currentPlan
          return (
            <div key={plan.key} style={{
              background: '#0d0d0d',
              border: isCurrent ? '1px solid #A855F7' : '1px solid #1e1e1e',
              borderRadius: '14px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: isCurrent ? '0 0 24px rgba(168,85,247,0.1)' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: '#A855F7', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em' }}>
                  {plan.label}
                </span>
                {isCurrent && (
                  <span style={{
                    background: 'rgba(168,85,247,0.15)', color: '#A855F7',
                    fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px',
                  }}>
                    Current Plan
                  </span>
                )}
              </div>

              <div style={{ color: '#fff', fontSize: '28px', fontWeight: 800, marginBottom: '4px' }}>
                {plan.price}
                <span style={{ fontSize: '13px', color: '#666', fontWeight: 400 }}>{plan.period}</span>
              </div>

              <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '12px' }}>{plan.exports}</div>

              {isCurrent && plan.key !== 'free' && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ color: '#666', fontSize: '12px', marginBottom: '4px' }}>
                    {exportsUsed} / {plan.maxExports} used
                  </div>
                  <div style={{ height: '4px', background: '#1a1a1a', borderRadius: '4px' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (exportsUsed / plan.maxExports) * 100)}%`,
                      background: 'linear-gradient(90deg,#7C3AED,#C026D3)',
                      borderRadius: '4px',
                    }} />
                  </div>
                </div>
              )}

              {/* flex: 1 pushes button to bottom of card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, marginBottom: '16px' }}>
                {plan.features.map(f => (
                  <div key={f} style={{ color: '#888', fontSize: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ color: '#A855F7' }}>✓</span> {f}
                  </div>
                ))}
              </div>

              {isCurrent && plan.key !== 'free' ? (
                <button
                  onClick={handleManage}
                  disabled={loading === 'portal'}
                  style={{
                    padding: '10px', background: '#1a1a1a', border: '1px solid #333',
                    borderRadius: '8px', color: '#aaa', fontSize: '13px',
                    cursor: 'pointer', fontWeight: 500,
                  }}
                >
                  {loading === 'portal' ? 'Loading...' : 'Manage subscription'}
                </button>
              ) : plan.cta && !isCurrent ? (
                <button
                  onClick={() => handleUpgrade(plan.cta as string)}
                  disabled={!!loading}
                  style={{
                    padding: '10px',
                    background: 'linear-gradient(135deg,#7C3AED,#C026D3)',
                    border: 'none', borderRadius: '8px', color: '#fff',
                    fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading === plan.cta ? 'Redirecting...' : `Upgrade to ${plan.label} →`}
                </button>
              ) : (
                <div style={{ height: '37px' }} />
              )}
            </div>
          )
        })}

        {/* Enterprise card — same grid cell, same height */}
        <div style={{
          background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: '14px',
          padding: '24px', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: '#A855F7', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em' }}>ENTERPRISE</span>
          </div>
          <div style={{ color: '#fff', fontSize: '28px', fontWeight: 800, marginBottom: '4px' }}>
            Custom
          </div>
          <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '12px' }}>2000+ exports/month</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, marginBottom: '16px' }}>
            {['Custom pricing', 'Invoicing', 'Dedicated support', 'SLA guarantee', 'Priority rendering', 'Team members'].map(f => (
              <div key={f} style={{ color: '#888', fontSize: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ color: '#A855F7' }}>✓</span> {f}
              </div>
            ))}
          </div>
          <a
            href="mailto:hello@viralhook.media"
            style={{
              display: 'block', padding: '10px', background: '#1a1a1a', border: '1px solid #333',
              borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600,
              textDecoration: 'none', textAlign: 'center',
            }}
          >
            Contact Us →
          </a>
        </div>
      </div>
    </div>
  )
}
