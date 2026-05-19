'use client'

import { useState } from 'react'

interface Props {
  userId: string
  phoneBypass: boolean
}

export default function AdminPhoneBypassToggle({ userId, phoneBypass }: Props) {
  const [checked, setChecked] = useState(phoneBypass)
  const [loading, setLoading] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.checked
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/phone-bypass`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_bypass: val }),
      })
      if (res.ok) setChecked(val)
      else e.target.checked = checked
    } finally {
      setLoading(false)
    }
  }

  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={handleChange}
      disabled={loading}
      title="Bypass phone verification for this user"
      style={{ width: 13, height: 13, cursor: loading ? 'not-allowed' : 'pointer', accentColor: '#A855F7', margin: 0 }}
    />
  )
}
