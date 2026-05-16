'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type SignupData = z.infer<typeof signupSchema>

export default function SignupForm() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
  })

  async function onSubmit(data: SignupData) {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError('Google sign-in failed. Please try again.')
  }

  if (success) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, textAlign: 'center', padding: '40px 0' }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(180deg, rgba(139,92,246,0.25), rgba(139,92,246,0.08))', border: '1px solid rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#A855F7" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <div>
          <h3 style={{ fontSize: 28, fontWeight: 700, color: '#ffffff', margin: '0 0 12px' }}>Check your email!</h3>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: 0, maxWidth: 340 }}>
            We sent a confirmation link to your email address. Click it to activate your account.
          </p>
        </div>
        <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 12, background: 'linear-gradient(90deg, #7C3AED, #C026D3)', color: '#ffffff', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
          Go to Sign In
        </Link>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <h2 className="auth-form-title">Create account</h2>
      <p className="auth-form-subtitle">Start generating viral content today.</p>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>Full name</label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 18, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(168,85,247,0.7)" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <input {...register('name')} type="text" autoComplete="name" placeholder="Your full name" className="auth-input" />
          </div>
          {errors.name && <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{errors.name.message}</p>}
        </div>

        {/* Email */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>Email</label>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 18, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(168,85,247,0.7)" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <input {...register('email')} type="email" autoComplete="email" placeholder="you@example.com" className="auth-input" />
          </div>
          {errors.email && <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>Password</label>
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

        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12 }}>
            <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading} className="auth-btn-primary">
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <button type="button" onClick={handleGoogleLogin} className="auth-btn-google">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 24 }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: '#A855F7', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
      </p>
    </div>
  )
}
