'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminDeleteButton({ userId, email }: { userId: string; email: string }) {
  const [state, setState] = useState<'idle' | 'confirm' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  async function confirmDelete() {
    setState('loading')
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    if (res.ok) {
      router.refresh()
    } else {
      const data = await res.json()
      setErrorMsg(data.error ?? 'Failed to delete')
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  if (state === 'confirm') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>Sure?</span>
        <button
          onClick={confirmDelete}
          style={{
            fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
            background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
            color: '#F87171', cursor: 'pointer',
          }}
        >
          Yes
        </button>
        <button
          onClick={() => setState('idle')}
          style={{
            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
          }}
        >
          No
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setState('confirm')}
      disabled={state === 'loading'}
      title={`Delete ${email}`}
      style={{
        fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
        background: state === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.08)',
        border: `1px solid ${state === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.2)'}`,
        color: '#F87171', cursor: state === 'loading' ? 'not-allowed' : 'pointer',
        opacity: state === 'loading' ? 0.5 : 1,
      }}
    >
      {state === 'loading' ? '...' : state === 'error' ? errorMsg : 'Delete'}
    </button>
  )
}
