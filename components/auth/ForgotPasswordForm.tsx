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
      <div className="flex flex-col items-center justify-center py-10 gap-5 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(139,92,246,0.2)' }}
        >
          <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white">Email trimis!</h3>
          <p className="mt-3 text-sm text-zinc-400 leading-relaxed max-w-xs mx-auto">
            Dacă există un cont cu această adresă, vei primi un link de resetare a parolei.
          </p>
        </div>
        <Link
          href="/login"
          className="mt-2 inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Înapoi la Login
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-7">
      <div>
        <h2 className="text-3xl font-bold text-white">Ai uitat parola?</h2>
        <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
          Introdu emailul și îți trimitem un link de resetare.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <label className="text-sm font-medium text-zinc-300">Email</label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            className="w-full pl-11 pr-4 py-3.5 rounded-xl text-white placeholder-zinc-600 focus:outline-none transition-all text-sm"
            style={{
              background: '#1a1a27',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.6)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
            placeholder="tu@example.com"
          />
        </div>
        {errors.email && <p className="text-sm text-red-400">{errors.email.message}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 font-semibold rounded-xl text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'linear-gradient(135deg, #6d28d9, #7c3aed)' }}
        onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'linear-gradient(135deg, #7c3aed, #9333ea)' }}
      >
        {loading ? 'Se trimite...' : 'Trimite link de resetare'}
      </button>

      <p className="text-center text-sm text-zinc-500">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 transition-colors font-medium"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Înapoi la Login
        </Link>
      </p>
    </form>
  )
}
