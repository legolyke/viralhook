'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const resetSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type ResetData = z.infer<typeof resetSchema>

export default function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  const { register, handleSubmit, formState: { errors } } = useForm<ResetData>({
    resolver: zodResolver(resetSchema),
  })

  async function onSubmit(data: ResetData) {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password: data.password })

    if (error) {
      setError('Error resetting password. Please try again.')
      setLoading(false)
      return
    }

    router.push('/login?message=password_updated')
  }

  if (!sessionReady) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center', padding: '40px 0' }}>
        <div style={{ width: 36, height: 36, border: '2px solid #A855F7', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', margin: 0 }}>Verifying reset link...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <h2 style={{ fontSize: 52, fontWeight: 700, color: '#ffffff', margin: '0 0 8px', lineHeight: 1.1 }}>
        New password
      </h2>
      <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', margin: '0 0 40px' }}>
        Choose a strong password for your account.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* New password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>New password</label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 20, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="rgba(168,85,247,0.7)" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <input
              {...register('password')}
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              style={{
                width: '100%', height: 72, borderRadius: 18,
                paddingLeft: 60, paddingRight: 20,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(168,85,247,0.45)',
                color: '#ffffff', fontSize: 16, outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 4px rgba(168,85,247,0.12)'; e.currentTarget.style.borderColor = 'rgba(168,85,247,0.7)' }}
              onBlur={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(168,85,247,0.45)' }}
            />
          </div>
          {errors.password && <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{errors.password.message}</p>}
        </div>

        {/* Confirm password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>Confirm password</label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 20, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="rgba(168,85,247,0.7)" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <input
              {...register('confirmPassword')}
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              style={{
                width: '100%', height: 72, borderRadius: 18,
                paddingLeft: 60, paddingRight: 20,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(168,85,247,0.45)',
                color: '#ffffff', fontSize: 16, outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 4px rgba(168,85,247,0.12)'; e.currentTarget.style.borderColor = 'rgba(168,85,247,0.7)' }}
              onBlur={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(168,85,247,0.45)' }}
            />
          </div>
          {errors.confirmPassword && <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{errors.confirmPassword.message}</p>}
        </div>

        {error && (
          <div style={{ padding: '14px 18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12 }}>
            <p style={{ fontSize: 14, color: '#f87171', margin: 0 }}>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', height: 74, borderRadius: 20,
            background: 'linear-gradient(90deg, #7C3AED, #C026D3)',
            border: 'none', color: '#ffffff', fontSize: 20, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'transform 0.15s, box-shadow 0.15s',
            marginTop: 12,
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 40px rgba(168,85,247,0.35)' } }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          {loading ? 'Saving...' : 'Reset Password'}
        </button>
      </form>
    </div>
  )
}
