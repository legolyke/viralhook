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

    // Always show success — never reveal if email exists in DB
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="text-center space-y-3">
        <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white">Email trimis</h3>
        <p className="text-sm text-zinc-400">
          Dacă există un cont cu această adresă, vei primi un link de resetare a parolei.
        </p>
        <Link href="/login" className="block text-sm text-purple-400 hover:text-purple-300 transition-colors pt-2">
          Înapoi la Login
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Resetare parolă</h2>
        <p className="text-sm text-zinc-400 mb-6">
          Introdu emailul și îți trimitem un link de resetare.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
        <input
          {...register('email')}
          type="email"
          autoComplete="email"
          className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
          placeholder="tu@example.com"
        />
        {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
      >
        {loading ? 'Se trimite...' : 'Send reset link'}
      </button>

      <p className="text-center text-sm text-zinc-500">
        <Link href="/login" className="text-purple-400 hover:text-purple-300 transition-colors">
          Înapoi la Login
        </Link>
      </p>
    </form>
  )
}
