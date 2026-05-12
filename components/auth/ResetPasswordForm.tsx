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
      <h2 className="auth-form-title">New password</h2>
      <p className="auth-form-subtitle">Choose a strong password for your account.</p>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* New password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>New password</label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 18, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(168,85,247,0.7)" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <input {...register('password')} type="password" autoComplete="new-password" placeholder="At least 8 characters" className="auth-input" />
          </div>
          {errors.password && <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{errors.password.message}</p>}
        </div>

        {/* Confirm password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>Confirm password</label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 18, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(168,85,247,0.7)" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <input {...register('confirmPassword')} type="password" autoComplete="new-password" placeholder="Repeat your password" className="auth-input" />
          </div>
          {errors.confirmPassword && <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{errors.confirmPassword.message}</p>}
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12 }}>
            <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading} className="auth-btn-primary">
          {loading ? 'Saving...' : 'Reset Password'}
        </button>
      </form>
    </div>
  )
}
