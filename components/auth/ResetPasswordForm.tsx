'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const resetSchema = z.object({
  password: z.string().min(8, 'Parola trebuie să aibă minim 8 caractere'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Parolele nu coincid',
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

    const { error } = await supabase.auth.updateUser({
      password: data.password,
    })

    if (error) {
      setError('Eroare la resetarea parolei. Încearcă din nou.')
      setLoading(false)
      return
    }

    router.push('/login?message=password_updated')
  }

  if (!sessionReady) {
    return (
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-zinc-400">Se verifică linkul de resetare...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">Parolă nouă</h2>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Parolă nouă</label>
        <input
          {...register('password')}
          type="password"
          autoComplete="new-password"
          className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
          placeholder="Minim 8 caractere"
        />
        {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Confirmă parola</label>
        <input
          {...register('confirmPassword')}
          type="password"
          autoComplete="new-password"
          className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
          placeholder="Repetă parola"
        />
        {errors.confirmPassword && <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
      >
        {loading ? 'Se salvează...' : 'Reset Password'}
      </button>
    </form>
  )
}
