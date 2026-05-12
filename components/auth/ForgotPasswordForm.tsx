'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const forgotSchema = z.object({
  email: z.string().email('Email invalid'),
})

type ForgotData = z.infer<typeof forgotSchema>

export default function ForgotPasswordForm() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotData>({
    resolver: zodResolver(forgotSchema),
  })

  async function onSubmit(data: ForgotData) {
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, textAlign: 'center', padding: '40px 0' }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(180deg, rgba(139,92,246,0.25), rgba(139,92,246,0.08))', border: '1px solid rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#A855F7" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>
        <div>
          <h3 style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', margin: '0 0 12px' }}>Email sent!</h3>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: 0, maxWidth: 340 }}>
            If an account exists with this email, you&apos;ll receive a password reset link shortly.
          </p>
        </div>
        <Link href="/login" style={{ fontSize: 15, color: '#A855F7', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, marginTop: 8 }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Login
        </Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <h2 style={{ fontSize: 40, fontWeight: 700, color: '#ffffff', margin: '0 0 8px', lineHeight: 1.1 }}>
        Forgot password?
      </h2>
      <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', margin: '0 0 40px' }}>
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>Email</label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 20, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="rgba(168,85,247,0.7)" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              style={{
                width: '100%',
                height: 72,
                borderRadius: 18,
                paddingLeft: 60,
                paddingRight: 20,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(168,85,247,0.45)',
                color: '#ffffff',
                fontSize: 16,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => {
                e.currentTarget.style.boxShadow = '0 0 0 4px rgba(168,85,247,0.12)'
                e.currentTarget.style.borderColor = 'rgba(168,85,247,0.7)'
              }}
              onBlur={e => {
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = 'rgba(168,85,247,0.45)'
              }}
            />
          </div>
          {errors.email && <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{errors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            height: 74,
            borderRadius: 20,
            background: 'linear-gradient(90deg, #7C3AED, #C026D3)',
            border: 'none',
            color: '#ffffff',
            fontSize: 20,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'transform 0.15s, box-shadow 0.15s',
            marginTop: 12,
          }}
          onMouseEnter={e => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 10px 40px rgba(168,85,247,0.35)'
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 28 }}>
        <Link href="/login" style={{ color: '#A855F7', textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Login
        </Link>
      </p>
    </div>
  )
}
