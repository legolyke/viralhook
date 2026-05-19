'use client'

import { useState } from 'react'

interface Props {
  userId: string
  phoneBypass: boolean
}

export default function AdminPhoneBypassToggle({ userId, phoneBypass }: Props) {
  const [checked, setChecked] = useState(phoneBypass)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/phone-bypass`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_bypass: !checked }),
      })
      if (res.ok) setChecked(v => !v)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={checked ? 'Phone bypass ON — click to disable' : 'Phone bypass OFF — click to enable'}
      style={{
        width: 36, height: 20, borderRadius: 10, border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        background: checked ? '#A855F7' : 'rgba(255,255,255,0.1)',
        position: 'relative', transition: 'background 0.2s', display: 'inline-block',
        opacity: loading ? 0.6 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 19 : 3,
        width: 14, height: 14, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', display: 'block',
      }} />
    </button>
  )
}
