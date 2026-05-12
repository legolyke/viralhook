# Authentication System (Modul 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sistem complet de autentificare cu email/parolă + Google OAuth, middleware de protecție rute, formulare dark mode premium.

**Architecture:** Next.js App Router cu middleware Supabase SSR care verifică sesiunea la fiecare request. Route group `(auth)` pentru pagini publice, `(dashboard)` pentru pagini protejate. Sesiunile stocate în cookies httpOnly + Secure + SameSite=Lax.

**Tech Stack:** Next.js 14+, TypeScript, Tailwind CSS, `@supabase/ssr`, `@supabase/supabase-js`, `react-hook-form`, `zod`, `@hookform/resolvers`

---

## File Map

| Fișier | Responsabilitate |
|--------|-----------------|
| `middleware.ts` | Verifică sesiunea și redirectează rute protejate |
| `lib/supabase/client.ts` | Client Supabase pentru browser (componente client) |
| `lib/supabase/server.ts` | Client Supabase pentru server (Server Components, Route Handlers) |
| `app/layout.tsx` | Root layout cu dark theme și font Inter |
| `app/(auth)/layout.tsx` | Layout centrat pentru paginile de auth |
| `app/(auth)/login/page.tsx` | Pagina login |
| `app/(auth)/signup/page.tsx` | Pagina signup |
| `app/(auth)/forgot-password/page.tsx` | Pagina forgot password |
| `app/(auth)/reset-password/page.tsx` | Pagina reset password |
| `app/auth/callback/route.ts` | Route handler OAuth + email verification |
| `components/auth/LoginForm.tsx` | Formular login cu validare Zod |
| `components/auth/SignupForm.tsx` | Formular signup cu validare Zod |
| `components/auth/ForgotPasswordForm.tsx` | Formular forgot password |
| `components/auth/ResetPasswordForm.tsx` | Formular reset password |
| `app/(dashboard)/dashboard/page.tsx` | Dashboard placeholder (protejat) |
| `app/(dashboard)/layout.tsx` | Layout dashboard cu verificare sesiune server-side |

---

### Task 1: Scaffold Next.js project

**Files:**
- Create: `D:\CLAUDE\proiecte\viralhook\` (scaffold în folder existent cu docs/)

- [ ] **Step 1: Navighează în folder și inițializează proiectul**

Run în PowerShell:
```powershell
cd "D:\CLAUDE\proiecte\viralhook"
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```
Dacă întreabă "The directory . contains files that could conflict." → răspunde `y` (Yes).
Expected: `Success! Created viralhook` fără erori.

- [ ] **Step 2: Instalează dependențele**

```powershell
npm install @supabase/ssr @supabase/supabase-js react-hook-form @hookform/resolvers zod
```
Expected: `added X packages` fără erori.

- [ ] **Step 3: Verifică că pornește**

```powershell
npm run dev
```
Expected: `ready - started server on 0.0.0.0:3000`. Deschide `http://localhost:3000` — apare pagina default Next.js.
Oprește serverul cu `Ctrl+C`.

- [ ] **Step 4: Commit inițial**

```powershell
git add .
git commit -m "feat: scaffold Next.js 14 with Tailwind, Supabase deps"
git remote add origin https://github.com/legolyke/viralhook.git
git push -u origin main
```
Expected: Push reușit.

---

### Task 2: Configurează Supabase (pași manuali)

**Files:** Niciun fișier de cod — pași în browser

- [ ] **Step 1: Creează proiect Supabase**

Mergi pe `https://supabase.com` → New Project.
- Name: `viralhook`
- Database Password: alege unul puternic, salvează-l
- Region: EU (Frankfurt)
Click **Create new project** și așteaptă ~2 minute.

- [ ] **Step 2: Copiază credențialele**

În Supabase Dashboard → Settings → API:
- Copiază `Project URL` (ex: `https://xxxx.supabase.co`)
- Copiază `anon public` key

- [ ] **Step 3: Activează Google OAuth**

În Supabase Dashboard → Authentication → Providers → Google:
- Toggle ON
- Vei vedea că are nevoie de `Client ID` și `Client Secret` din Google Cloud Console.

**Pentru Google Cloud Console:**
1. Mergi pe `https://console.cloud.google.com`
2. Creează un proiect nou `viralhook`
3. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
4. Application type: Web application
5. Authorized redirect URIs: `https://xxxx.supabase.co/auth/v1/callback` (înlocuiește `xxxx` cu ID-ul tău Supabase)
6. Copiază `Client ID` și `Client Secret` în Supabase → Google Provider → Save

- [ ] **Step 4: Configurează URL-ul de redirect**

În Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `http://localhost:3000` (pentru development)
- Redirect URLs: adaugă `http://localhost:3000/auth/callback`

---

### Task 3: Variabile de mediu + Supabase clients

**Files:**
- Create: `.env.local`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Creează `.env.local`**

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```
Înlocuiește cu valorile reale din Task 2.

- [ ] **Step 2: Adaugă `.env.local` în `.gitignore`**

Verifică că `.gitignore` conține deja `.env.local`. Dacă nu:
```
echo ".env.local" >> .gitignore
```

- [ ] **Step 3: Creează `lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 4: Creează `lib/supabase/server.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 5: Commit**

```powershell
git add lib/ .env.local .gitignore
git commit -m "feat: add Supabase client utilities"
```

---

### Task 4: Middleware pentru protecția rutelor

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Creează `middleware.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Rute protejate — redirect la login dacă nu e autentificat
  if (!user && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Rute auth — redirect la dashboard dacă e deja autentificat
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 2: Commit**

```powershell
git add middleware.ts
git commit -m "feat: add middleware for route protection"
```

---

### Task 5: Root layout + Auth layout

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/(auth)/layout.tsx`

- [ ] **Step 1: Actualizează `app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ViralHook — AI Viral Shorts Generator',
  description: 'Turn long videos into viral shorts using AI.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0a0a0a] text-white antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Creează `app/(auth)/layout.tsx`**

```typescript
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Viral<span className="text-purple-500">Hook</span>
          </h1>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```powershell
git add app/layout.tsx app/
git commit -m "feat: add root layout and auth layout with dark theme"
```

---

### Task 6: Auth callback route (OAuth + email verification)

**Files:**
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1: Creează `app/auth/callback/route.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
```

- [ ] **Step 2: Commit**

```powershell
git add app/auth/
git commit -m "feat: add auth callback route for OAuth and email verification"
```

---

### Task 7: LoginForm component + pagina Login

**Files:**
- Create: `components/auth/LoginForm.tsx`
- Create: `app/(auth)/login/page.tsx`

- [ ] **Step 1: Creează `components/auth/LoginForm.tsx`**

```typescript
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

export default function LoginForm() {
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">Bine ai revenit</h2>
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

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Parolă</label>
        <input
          {...register('password')}
          type="password"
          autoComplete="current-password"
          className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
          placeholder="••••••••"
        />
        {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
      </div>

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
          Ai uitat parola?
        </Link>
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
        {loading ? 'Se conectează...' : 'Sign In'}
      </button>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-zinc-950 text-zinc-500">sau</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-3"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      <p className="text-center text-sm text-zinc-500 pt-2">
        Nu ai cont?{' '}
        <Link href="/signup" className="text-purple-400 hover:text-purple-300 transition-colors">
          Creează unul
        </Link>
      </p>
    </form>
  )
}
```

- [ ] **Step 2: Creează `app/(auth)/login/page.tsx`**

```typescript
import LoginForm from '@/components/auth/LoginForm'

export default function LoginPage() {
  return <LoginForm />
}
```

- [ ] **Step 3: Pornește dev server și testează manual**

```powershell
npm run dev
```
Deschide `http://localhost:3000/login` — trebuie să apară formularul dark mode.
Testează:
- Trimite formular gol → mesaje de validare apar
- Email invalid → mesaj "Email invalid"
- Parolă sub 8 caractere → mesaj "minim 8 caractere"
Oprește serverul cu `Ctrl+C`.

- [ ] **Step 4: Commit**

```powershell
git add components/ app/
git commit -m "feat: add login page with form validation and Google OAuth"
```

---

### Task 8: SignupForm component + pagina Signup

**Files:**
- Create: `components/auth/SignupForm.tsx`
- Create: `app/(auth)/signup/page.tsx`

- [ ] **Step 1: Creează `components/auth/SignupForm.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const signupSchema = z.object({
  name: z.string().min(2, 'Numele trebuie să aibă minim 2 caractere'),
  email: z.string().email('Email invalid'),
  password: z.string().min(8, 'Parola trebuie să aibă minim 8 caractere'),
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
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  if (success) {
    return (
      <div className="text-center space-y-3">
        <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white">Verifică emailul</h3>
        <p className="text-sm text-zinc-400">
          Am trimis un link de confirmare la adresa ta de email. Apasă pe el pentru a activa contul.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">Creează cont gratuit</h2>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Nume</label>
        <input
          {...register('name')}
          type="text"
          autoComplete="name"
          className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
          placeholder="Numele tău"
        />
        {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>}
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

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Parolă</label>
        <input
          {...register('password')}
          type="password"
          autoComplete="new-password"
          className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
          placeholder="Minim 8 caractere"
        />
        {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
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
        {loading ? 'Se creează contul...' : 'Create Account'}
      </button>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-zinc-950 text-zinc-500">sau</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-3"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      <p className="text-center text-sm text-zinc-500 pt-2">
        Ai deja cont?{' '}
        <Link href="/login" className="text-purple-400 hover:text-purple-300 transition-colors">
          Autentifică-te
        </Link>
      </p>
    </form>
  )
}
```

- [ ] **Step 2: Creează `app/(auth)/signup/page.tsx`**

```typescript
import SignupForm from '@/components/auth/SignupForm'

export default function SignupPage() {
  return <SignupForm />
}
```

- [ ] **Step 3: Testează manual**

```powershell
npm run dev
```
Deschide `http://localhost:3000/signup`.
Testează validarea formularului (câmpuri goale, email invalid, parolă scurtă).
Oprește serverul.

- [ ] **Step 4: Commit**

```powershell
git add components/auth/SignupForm.tsx app/
git commit -m "feat: add signup page with email verification flow"
```

---

### Task 9: ForgotPasswordForm + pagina Forgot Password

**Files:**
- Create: `components/auth/ForgotPasswordForm.tsx`
- Create: `app/(auth)/forgot-password/page.tsx`

- [ ] **Step 1: Creează `components/auth/ForgotPasswordForm.tsx`**

```typescript
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

    // Afișăm mereu succes pentru a nu expune dacă emailul există în baza de date
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
```

- [ ] **Step 2: Creează `app/(auth)/forgot-password/page.tsx`**

```typescript
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
```

- [ ] **Step 3: Commit**

```powershell
git add components/auth/ForgotPasswordForm.tsx app/
git commit -m "feat: add forgot password page"
```

---

### Task 10: ResetPasswordForm + pagina Reset Password

**Files:**
- Create: `components/auth/ResetPasswordForm.tsx`
- Create: `app/(auth)/reset-password/page.tsx`

- [ ] **Step 1: Creează `components/auth/ResetPasswordForm.tsx`**

```typescript
'use client'

import { useState } from 'react'
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
  const router = useRouter()
  const supabase = createClient()

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
```

- [ ] **Step 2: Creează `app/(auth)/reset-password/page.tsx`**

```typescript
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
```

- [ ] **Step 3: Commit**

```powershell
git add components/auth/ResetPasswordForm.tsx app/
git commit -m "feat: add reset password page"
```

---

### Task 11: Dashboard placeholder (pagină protejată)

**Files:**
- Create: `app/(dashboard)/layout.tsx`
- Create: `app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Creează `app/(dashboard)/layout.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <>{children}</>
}
```

- [ ] **Step 2: Creează `app/(dashboard)/dashboard/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-white">
          Viral<span className="text-purple-500">Hook</span> Dashboard
        </h1>
        <p className="text-zinc-400">
          Bine ai venit, <span className="text-white">{user.email}</span>
        </p>
        <p className="text-sm text-zinc-600">Modul 2 — Dashboard UI urmează</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```powershell
git add app/
git commit -m "feat: add dashboard placeholder with server-side auth check"
```

---

### Task 12: Testing complet + push final

- [ ] **Step 1: Pornește serverul**

```powershell
npm run dev
```

- [ ] **Step 2: Testează fiecare flow**

Bifează fiecare:
- [ ] `http://localhost:3000/login` → se afișează formularul
- [ ] `http://localhost:3000/signup` → se afișează formularul
- [ ] `http://localhost:3000/forgot-password` → se afișează formularul
- [ ] `http://localhost:3000/dashboard` → redirect la `/login` (middleware funcționează)
- [ ] Login cu credențiale greșite → mesaj de eroare vizibil
- [ ] Signup cu email real → mesaj "Verifică emailul" apare
- [ ] Confirmi emailul → redirect la `/dashboard`
- [ ] `/login` după autentificare → redirect la `/dashboard`
- [ ] Google OAuth → click buton → redirect la Google → revenire în dashboard

- [ ] **Step 3: Build de producție**

```powershell
npm run build
```
Expected: Build reușit fără erori TypeScript sau de compilare.

- [ ] **Step 4: Push final**

```powershell
git push origin main
```
Expected: Vercel detectează push-ul și pornește un deploy automat. Verifică în Vercel dashboard că deploy-ul a reușit.

- [ ] **Step 5: Configurează variabilele de mediu în Vercel**

În Vercel Dashboard → proiect viralhook → Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL` → valoarea din .env.local
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → valoarea din .env.local

Redeploy din Vercel după adăugare.

---

## Checklist final Modul 1

- [ ] Signup cu email + verificare email funcționează
- [ ] Login cu email + parolă funcționează
- [ ] Login cu Google funcționează
- [ ] Forgot password → email primit → reset password funcționează
- [ ] `/dashboard` fără sesiune → redirect la `/login`
- [ ] `/login` cu sesiune activă → redirect la `/dashboard`
- [ ] Build de producție fără erori
- [ ] Deploy pe Vercel reușit
