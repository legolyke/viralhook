'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const loginSchema = z.object({
  email: z.string().email('Email invalid'),
  password: z.string().min(8, 'Parola trebuie să aibă minim 8 caractere'),
})

type LoginData = z.infer<typeof loginSchema>

interface LoginFormProps {
  message?: string
  errorParam?: string
}

export default function LoginForm({ message, errorParam }: LoginFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginData) {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      setError('Email sau parolă incorectă.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
    setLoading(false)
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="mb-2">
        <h2 className="text-2xl font-semibold text-white">Bine ai revenit</h2>
        <p className="mt-1 text-sm text-zinc-400">Intră în contul tău</p>
      </div>

      {message === 'password_updated' && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
          <p className="text-sm text-green-400">Parola a fost resetată cu succes. Te poți autentifica acum.</p>
        </div>
      )}

      {errorParam === 'auth_callback_failed' && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-sm text-red-400">Autentificarea a eșuat. Încearcă din nou.</p>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-zinc-300">Email</label>
        <input
          {...register('email')}
          type="email"
          autoComplete="email"
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all"
          placeholder="tu@example.com"
        />
        {errors.email && <p className="text-sm text-red-400">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-zinc-300">Parolă</label>
          <Link href="/forgot-password" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
            Ai uitat parola?
          </Link>
        </div>
        <input
          {...register('password')}
          type="password"
          autoComplete="current-password"
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all"
          placeholder="••••••••"
        />
        {errors.password && <p className="text-sm text-red-400">{errors.password.message}</p>}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors mt-2"
      >
        {loading ? 'Se conectează...' : 'Sign In'}
      </button>

      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-zinc-950 text-zinc-500">sau</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-3"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      <p className="text-center text-sm text-zinc-500 pt-1">
        Nu ai cont?{' '}
        <Link href="/signup" className="text-purple-400 hover:text-purple-300 transition-colors font-medium">
          Creează unul
        </Link>
      </p>
    </form>
  )
}
