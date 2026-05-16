'use client'

import { useState } from 'react'
import type { PlanName } from '@/lib/plans'

const PLANS: PlanName[] = ['free', 'creator', 'pro', 'agency']

export default function AdminPlanSelector({ userId, currentPlan }: { userId: string; currentPlan: PlanName }) {
  const [plan, setPlan] = useState<PlanName>(currentPlan)
  const [status, setStatus] = useState<'idle' | 'loading' | 'saved' | 'error'>('idle')

  async function save() {
    if (plan === currentPlan) return
    setStatus('loading')
    const res = await fetch(`/api/admin/users/${userId}/plan`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    setStatus(res.ok ? 'saved' : 'error')
    if (res.ok) setTimeout(() => setStatus('idle'), 2000)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <select
        value={plan}
        onChange={e => { setPlan(e.target.value as PlanName); setStatus('idle') }}
        style={{
          background: 'rgba(168,85,247,0.1)',
          border: '1px solid rgba(168,85,247,0.25)',
          borderRadius: 6,
          color: '#E9D5FF',
          fontSize: 11,
          fontWeight: 600,
          padding: '3px 6px',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        {PLANS.map(p => (
          <option key={p} value={p} style={{ background: '#111', color: '#E9D5FF' }}>
            {p.toUpperCase()}
          </option>
        ))}
      </select>

      <button
        onClick={save}
        disabled={status === 'loading' || plan === currentPlan}
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: '3px 10px',
          borderRadius: 6,
          border: 'none',
          cursor: plan === currentPlan || status === 'loading' ? 'not-allowed' : 'pointer',
          background: status === 'saved'
            ? 'rgba(74,222,128,0.15)'
            : status === 'error'
            ? 'rgba(239,68,68,0.15)'
            : 'linear-gradient(90deg,#7C3AED,#C026D3)',
          color: status === 'saved' ? '#4ADE80' : status === 'error' ? '#F87171' : '#fff',
          opacity: plan === currentPlan || status === 'loading' ? 0.4 : 1,
          transition: 'all 0.2s',
        }}
      >
        {status === 'loading' ? '...' : status === 'saved' ? 'Saved ✓' : status === 'error' ? 'Error' : 'Save'}
      </button>
    </div>
  )
}
