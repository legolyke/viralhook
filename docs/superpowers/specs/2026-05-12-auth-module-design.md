# Modul 1 — Authentication System Design

**Proiect:** ViralHook (viralhook.media)
**Data:** 2026-05-12
**Status:** Aprobat

---

## Scop

Sistem complet de autentificare pentru aplicația AI Viral Shorts Generator SaaS. Permite utilizatorilor să-și creeze cont, să se autentifice și să acceseze dashboard-ul protejat.

---

## Arhitectură

**Abordare aleasă:** Supabase Auth + Next.js Middleware

Middleware-ul Next.js interceptează fiecare request înainte ca pagina să se randeze. Verifică sesiunea din cookies și redirectează automat:
- User neautentificat pe rută protejată → `/login`
- User autentificat pe `/login` sau `/signup` → `/dashboard`

Sesiunile sunt stocate în cookies `httpOnly + Secure + SameSite=Lax`.

---

## Structura fișierelor

```
viralhook/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/
│   │   └── dashboard/page.tsx
│   └── layout.tsx
├── middleware.ts
├── lib/
│   └── supabase/
│       ├── client.ts
│       └── server.ts
└── components/
    └── auth/
        ├── LoginForm.tsx
        ├── SignupForm.tsx
        ├── ForgotPasswordForm.tsx
        └── ResetPasswordForm.tsx
```

---

## Pagini

### `/signup`
- Câmpuri: Nume, Email, Parolă
- Buton: "Create Account"
- Buton: "Continue with Google"
- Link: "Already have an account? Login"
- Email verification obligatoriu după signup

### `/login`
- Câmpuri: Email, Parolă
- Buton: "Sign In"
- Buton: "Continue with Google"
- Link: "Forgot password?"
- Link: "Don't have an account? Sign Up"

### `/forgot-password`
- Câmp: Email
- Buton: "Send reset link"
- Supabase trimite automat emailul de resetare
- Userul vede mesaj de confirmare după trimitere

### `/reset-password`
- Accesat doar prin linkul din email (token Supabase în URL)
- Câmpuri: Parolă nouă, Confirmă parola
- Buton: "Reset Password"
- După succes → redirect la `/login`

---

## Protecție rute

| Rută | Comportament |
|------|-------------|
| `/dashboard/*` | Redirect la `/login` dacă neautentificat |
| `/login`, `/signup` | Redirect la `/dashboard` dacă autentificat |
| `/` (landing) | Accesibil tuturor |

---

## Securitate

- **Cookies:** `httpOnly` + `Secure` + `SameSite=Lax` — protejate XSS
- **Rate limiting:** Max 5 încercări/minut per IP pe login/signup (Supabase built-in)
- **Parole:** Minimum 8 caractere, hashate cu bcrypt de Supabase
- **Email verification:** Cont inactiv până la confirmare email
- **Google OAuth:** PKCE flow, noi nu atingem credențialele Google
- **JWT:** Verificate server-side la fiecare request prin middleware
- **Variabile de mediu:**
  - `NEXT_PUBLIC_SUPABASE_URL` — public, safe
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public, safe
  - `SUPABASE_SERVICE_ROLE_KEY` — doar server-side, niciodată client

---

## Design

- Dark mode, background aproape negru (#0a0a0a)
- Card centrat pe pagină, padding generos
- Accent color: electric purple
- Font: Inter
- Buton Google cu icon oficial
- Mesaje de eroare clare și vizibile (red accent)
- Loading state pe butoane în timpul request-urilor

---

## Tech Stack

- Next.js 14+ App Router
- TypeScript
- Tailwind CSS
- Supabase Auth (`@supabase/ssr`)
- `@supabase/supabase-js`

---

## Out of scope (Modul 1)

- 2FA / MFA
- Magic link login
- Social login altul decât Google
- Team invites (Modul 11 — Billing)
