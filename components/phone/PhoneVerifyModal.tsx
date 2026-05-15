'use client'

import { useState, useRef, useEffect } from 'react'

interface Country {
  name: string
  code: string
  dial: string
  flag: string
}

const COUNTRIES: Country[] = [
  { name: 'Romania', code: 'RO', dial: '40', flag: '🇷🇴' },
  { name: 'United States', code: 'US', dial: '1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', dial: '44', flag: '🇬🇧' },
  { name: 'Germany', code: 'DE', dial: '49', flag: '🇩🇪' },
  { name: 'France', code: 'FR', dial: '33', flag: '🇫🇷' },
  { name: 'Italy', code: 'IT', dial: '39', flag: '🇮🇹' },
  { name: 'Spain', code: 'ES', dial: '34', flag: '🇪🇸' },
  { name: 'Netherlands', code: 'NL', dial: '31', flag: '🇳🇱' },
  { name: 'Belgium', code: 'BE', dial: '32', flag: '🇧🇪' },
  { name: 'Switzerland', code: 'CH', dial: '41', flag: '🇨🇭' },
  { name: 'Austria', code: 'AT', dial: '43', flag: '🇦🇹' },
  { name: 'Poland', code: 'PL', dial: '48', flag: '🇵🇱' },
  { name: 'Hungary', code: 'HU', dial: '36', flag: '🇭🇺' },
  { name: 'Czech Republic', code: 'CZ', dial: '420', flag: '🇨🇿' },
  { name: 'Bulgaria', code: 'BG', dial: '359', flag: '🇧🇬' },
  { name: 'Greece', code: 'GR', dial: '30', flag: '🇬🇷' },
  { name: 'Portugal', code: 'PT', dial: '351', flag: '🇵🇹' },
  { name: 'Sweden', code: 'SE', dial: '46', flag: '🇸🇪' },
  { name: 'Norway', code: 'NO', dial: '47', flag: '🇳🇴' },
  { name: 'Denmark', code: 'DK', dial: '45', flag: '🇩🇰' },
  { name: 'Finland', code: 'FI', dial: '358', flag: '🇫🇮' },
  { name: 'Canada', code: 'CA', dial: '1', flag: '🇨🇦' },
  { name: 'Australia', code: 'AU', dial: '61', flag: '🇦🇺' },
  { name: 'India', code: 'IN', dial: '91', flag: '🇮🇳' },
  { name: 'Brazil', code: 'BR', dial: '55', flag: '🇧🇷' },
  { name: 'Mexico', code: 'MX', dial: '52', flag: '🇲🇽' },
  { name: 'Turkey', code: 'TR', dial: '90', flag: '🇹🇷' },
  { name: 'Ukraine', code: 'UA', dial: '380', flag: '🇺🇦' },
  { name: 'Moldova', code: 'MD', dial: '373', flag: '🇲🇩' },
  { name: 'Serbia', code: 'RS', dial: '381', flag: '🇷🇸' },
]

interface PhoneVerifyModalProps {
  onVerified: () => void
  onClose: () => void
}

export default function PhoneVerifyModal({ onVerified, onClose }: PhoneVerifyModalProps) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [search, setSearch] = useState('')
  const [showCountries, setShowCountries] = useState(false)
  const [selected, setSelected] = useState<Country>(COUNTRIES[0])
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendCountdown, setResendCountdown] = useState(0)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.includes(search.replace('+', ''))
  )

  useEffect(() => {
    if (resendCountdown <= 0) return
    const t = setTimeout(() => setResendCountdown(v => v - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCountdown])

  async function handleSend() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/user/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, dial_code: selected.dial }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error === 'Phone already registered'
          ? 'This phone number is already registered to another account.'
          : data.error ?? 'Failed to send code')
        return
      }
      setStep('otp')
      setResendCountdown(30)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    setError(null)
    setLoading(true)
    const token = otp.join('')
    try {
      const res = await fetch('/api/user/phone', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, dial_code: selected.dial, token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Invalid code')
        setOtp(['', '', '', '', '', ''])
        otpRefs.current[0]?.focus()
        return
      }
      onVerified()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleOtpInput(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    if (digit && index < 5) otpRefs.current[index + 1]?.focus()
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const maskedPhone = `+${selected.dial} ${phone.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3')}`

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: '#111', border: '1px solid #222', borderRadius: '16px',
        padding: '32px', width: '100%', maxWidth: '420px',
        boxShadow: '0 0 60px rgba(168,85,247,0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>📱</div>
            <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>Verify your phone</h2>
            <p style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>One-time verification to prevent abuse.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
        </div>

        {step === 'phone' && (
          <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowCountries(v => !v)}
                  style={{
                    height: '48px', padding: '0 12px', background: '#1a1a1a',
                    border: '1px solid #333', borderRadius: '10px', color: '#fff',
                    cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '14px',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  {selected.flag} +{selected.dial} <span style={{ color: '#666' }}>▾</span>
                </button>
                {showCountries && (
                  <div style={{
                    position: 'absolute', top: '52px', left: 0, zIndex: 10,
                    background: '#1a1a1a', border: '1px solid #333', borderRadius: '10px',
                    width: '240px', maxHeight: '240px', overflowY: 'auto',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  }}>
                    <div style={{ padding: '8px' }}>
                      <input
                        autoFocus
                        placeholder="Search country..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                          width: '100%', padding: '8px 10px', background: '#111',
                          border: '1px solid #333', borderRadius: '8px', color: '#fff',
                          fontSize: '13px', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    {filtered.map(c => (
                      <button
                        key={c.code}
                        onClick={() => { setSelected(c); setShowCountries(false); setSearch('') }}
                        style={{
                          width: '100%', padding: '10px 12px', background: 'none',
                          border: 'none', color: '#ccc', cursor: 'pointer', textAlign: 'left',
                          fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#222')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        {c.flag} {c.name} <span style={{ color: '#666', marginLeft: 'auto' }}>+{c.dial}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="tel"
                placeholder="07XX XXX XXX"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                style={{
                  flex: 1, height: '48px', padding: '0 14px', background: '#1a1a1a',
                  border: '1px solid #333', borderRadius: '10px', color: '#fff',
                  fontSize: '15px', outline: 'none',
                }}
              />
            </div>

            {error && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}

            <button
              onClick={handleSend}
              disabled={loading || phone.length < 7}
              style={{
                width: '100%', height: '48px', background: loading || phone.length < 7
                  ? '#2a1a3e' : 'linear-gradient(135deg,#7C3AED,#C026D3)',
                border: 'none', borderRadius: '10px', color: '#fff',
                fontSize: '15px', fontWeight: 600, cursor: loading || phone.length < 7 ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Sending...' : 'Send Code →'}
            </button>
          </>
        )}

        {step === 'otp' && (
          <>
            <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '20px' }}>
              Enter the 6-digit code sent to <strong style={{ color: '#fff' }}>{maskedPhone}</strong>
            </p>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { otpRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpInput(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  style={{
                    width: '44px', height: '52px', textAlign: 'center',
                    background: '#1a1a1a', border: `1px solid ${digit ? '#A855F7' : '#333'}`,
                    borderRadius: '10px', color: '#fff', fontSize: '20px', fontWeight: 700,
                    outline: 'none',
                  }}
                />
              ))}
            </div>

            {error && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>{error}</p>}

            <button
              onClick={handleVerify}
              disabled={loading || otp.join('').length !== 6}
              style={{
                width: '100%', height: '48px',
                background: loading || otp.join('').length !== 6
                  ? '#2a1a3e' : 'linear-gradient(135deg,#7C3AED,#C026D3)',
                border: 'none', borderRadius: '10px', color: '#fff',
                fontSize: '15px', fontWeight: 600,
                cursor: loading || otp.join('').length !== 6 ? 'not-allowed' : 'pointer',
                marginBottom: '12px',
              }}
            >
              {loading ? 'Verifying...' : 'Verify →'}
            </button>

            <button
              onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError(null) }}
              disabled={resendCountdown > 0}
              style={{
                width: '100%', height: '36px', background: 'none', border: 'none',
                color: resendCountdown > 0 ? '#555' : '#A855F7',
                fontSize: '13px', cursor: resendCountdown > 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend code'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
