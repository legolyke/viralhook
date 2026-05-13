'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [nameSaving, setNameSaving] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setEmail(user.email ?? '')
      const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? ''
      setDisplayName(name)
      setNameInput(name)
    })
  }, [])

  async function saveName() {
    if (!nameInput.trim()) {
      setNameMsg({ type: 'err', text: 'Name cannot be empty.' })
      return
    }
    setNameSaving(true)
    setNameMsg(null)
    const { error } = await supabase.auth.updateUser({ data: { full_name: nameInput.trim() } })
    setNameSaving(false)
    if (error) {
      setNameMsg({ type: 'err', text: error.message })
    } else {
      setDisplayName(nameInput.trim())
      setNameMsg({ type: 'ok', text: 'Name updated successfully.' })
      router.refresh()
    }
  }

  async function changePassword() {
    if (newPassword.length < 8) {
      setPwMsg({ type: 'err', text: 'Password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'err', text: 'Passwords do not match.' })
      return
    }
    setPwSaving(true)
    setPwMsg(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwSaving(false)
    if (error) {
      setPwMsg({ type: 'err', text: error.message })
    } else {
      setPwMsg({ type: 'ok', text: 'Password changed successfully.' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  const initial = (displayName || email)[0]?.toUpperCase() ?? 'U'

  return (
    <div className="dashboard-content" style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Profile</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Manage your account details</p>
      </div>

      {/* Avatar + email */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#C026D3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {initial}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{displayName || email}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{email}</div>
        </div>
      </div>

      {/* Display name */}
      <section style={{ background: '#0b0b14', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 16px' }}>Display Name</h2>
        <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
          Full name
        </label>
        <input
          type="text"
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') saveName() }}
          placeholder="Your name"
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: '10px 12px',
            color: '#E9D5FF',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: 12,
          }}
        />
        {nameMsg && (
          <p style={{ fontSize: 12, color: nameMsg.type === 'ok' ? '#4ade80' : '#F87171', margin: '0 0 10px' }}>
            {nameMsg.text}
          </p>
        )}
        <button
          onClick={saveName}
          disabled={nameSaving || nameInput.trim() === displayName}
          style={{
            padding: '9px 20px',
            borderRadius: 8,
            background: nameSaving || nameInput.trim() === displayName ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg,#7C3AED,#C026D3)',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            fontSize: 13,
            cursor: nameSaving || nameInput.trim() === displayName ? 'not-allowed' : 'pointer',
          }}
        >
          {nameSaving ? 'Saving...' : 'Save Name'}
        </button>
      </section>

      {/* Change password */}
      <section style={{ background: '#0b0b14', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 16, padding: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 16px' }}>Change Password</h2>
        {[
          { label: 'New password', value: newPassword, setter: setNewPassword, placeholder: 'At least 8 characters' },
          { label: 'Confirm new password', value: confirmPassword, setter: setConfirmPassword, placeholder: 'Repeat new password' },
        ].map(({ label, value, setter, placeholder }) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{label}</label>
            <input
              type="password"
              value={value}
              onChange={e => setter(e.target.value)}
              placeholder={placeholder}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '10px 12px',
                color: '#E9D5FF',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        ))}
        {pwMsg && (
          <p style={{ fontSize: 12, color: pwMsg.type === 'ok' ? '#4ade80' : '#F87171', margin: '0 0 10px' }}>
            {pwMsg.text}
          </p>
        )}
        <button
          onClick={changePassword}
          disabled={pwSaving || !newPassword || !confirmPassword}
          style={{
            padding: '9px 20px',
            borderRadius: 8,
            background: pwSaving || !newPassword || !confirmPassword ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg,#7C3AED,#C026D3)',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            fontSize: 13,
            cursor: pwSaving || !newPassword || !confirmPassword ? 'not-allowed' : 'pointer',
          }}
        >
          {pwSaving ? 'Saving...' : 'Change Password'}
        </button>
      </section>
    </div>
  )
}
