# Dashboard UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the ViralHook Dashboard UI shell — sidebar navigation, home page with upload zone + 4 stat cards + empty state, and styled placeholder pages for Projects, Analytics, Billing, Settings.

**Architecture:** Next.js nested layouts: `app/(dashboard)/layout.tsx` is a Server Component that reads the authenticated user and passes email/plan to the `Sidebar` client component. Each sub-page is a Server Component rendering only its content. Interactive parts (`Sidebar`, `UploadZone`) use `'use client'`.

**Tech Stack:** Next.js 16.2.6, TypeScript, React 19, Tailwind CSS v4 (but we use CSS classes in `globals.css` like the auth pages), Supabase SSR (`lib/supabase/server.ts`).

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `app/globals.css` | Modify | Add dashboard CSS classes |
| `components/dashboard/Sidebar.tsx` | Create | Sidebar navigation ('use client') |
| `components/dashboard/StatsCard.tsx` | Create | Stat card with optional progress bar |
| `components/dashboard/UploadZone.tsx` | Create | Drag & drop upload area ('use client') |
| `components/dashboard/EmptyState.tsx` | Create | Reusable empty state |
| `components/dashboard/PageHeader.tsx` | Create | Title + breadcrumb for placeholder pages |
| `app/(dashboard)/layout.tsx` | Modify | Add Sidebar + main wrapper |
| `app/(dashboard)/dashboard/page.tsx` | Modify | Home page (replaces current placeholder) |
| `app/(dashboard)/projects/page.tsx` | Create | Projects placeholder |
| `app/(dashboard)/analytics/page.tsx` | Create | Analytics placeholder |
| `app/(dashboard)/billing/page.tsx` | Create | Billing placeholder |
| `app/(dashboard)/settings/page.tsx` | Create | Settings placeholder |

---

## Task 1: Dashboard CSS classes

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add dashboard CSS at the end of `app/globals.css`**

```css
/* ─── Dashboard layout ─────────────────────────────────── */
.dashboard-layout {
  display: flex;
  min-height: 100vh;
  background: #000000;
}

.dashboard-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: #080810;
  border-right: 1px solid rgba(168,85,247,0.12);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 40;
  transition: transform 0.25s ease;
}

.dashboard-main {
  flex: 1;
  margin-left: 240px;
  min-height: 100vh;
}

.dashboard-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  font-size: 13px;
  color: rgba(255,255,255,0.55);
  text-decoration: none;
  transition: background 0.1s, color 0.1s;
  border: 1px solid transparent;
}

.dashboard-nav-item:hover {
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.8);
}

.dashboard-nav-item-active {
  background: rgba(168,85,247,0.12) !important;
  border-color: rgba(168,85,247,0.2) !important;
  color: #ffffff !important;
  font-weight: 500;
}

.dashboard-nav-new {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #C084FC;
  text-decoration: none;
  background: linear-gradient(90deg, rgba(124,58,237,0.12), rgba(192,38,211,0.08));
  border: 1px solid rgba(168,85,247,0.25);
  margin: 4px 0;
  transition: opacity 0.15s;
}

.dashboard-nav-new:hover {
  opacity: 0.85;
}

.dashboard-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.dashboard-hamburger {
  display: none;
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 50;
  background: rgba(10,10,18,0.95);
  border: 1px solid rgba(168,85,247,0.2);
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  color: rgba(255,255,255,0.7);
  align-items: center;
  justify-content: center;
}

.dashboard-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  z-index: 35;
}

.sidebar-close-btn {
  display: none;
  background: none;
  border: none;
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  padding: 4px;
  align-items: center;
  justify-content: center;
}

@media (max-width: 768px) {
  .dashboard-sidebar {
    transform: translateX(-100%);
  }
  .dashboard-sidebar.open {
    transform: translateX(0);
  }
  .dashboard-main {
    margin-left: 0;
    padding-top: 60px;
  }
  .dashboard-hamburger {
    display: flex;
  }
  .dashboard-overlay.open {
    display: block;
  }
  .dashboard-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .sidebar-close-btn {
    display: flex;
  }
}
```

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

## Task 2: Sidebar component

**Files:**
- Create: `components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
  email: string
  plan?: string
}

const NAV_MAIN = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    href: '/projects',
    label: 'Projects',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
      </svg>
    ),
  },
]

const NAV_BOTTOM = [
  {
    href: '/analytics',
    label: 'Analytics',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
  {
    href: '/billing',
    label: 'Billing',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
]

export default function Sidebar({ email, plan = 'FREE' }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const supabase = createClient()

  const initial = email ? email[0].toUpperCase() : 'U'

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <button className="dashboard-hamburger" onClick={() => setOpen(true)} aria-label="Open menu">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      <div className={`dashboard-overlay${open ? ' open' : ''}`} onClick={() => setOpen(false)} />

      <aside className={`dashboard-sidebar${open ? ' open' : ''}`}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            Viral<span style={{ background: 'linear-gradient(90deg,#7C3AED,#C026D3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Hook</span>
          </span>
          <button className="sidebar-close-btn" onClick={() => setOpen(false)} aria-label="Close menu">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {NAV_MAIN.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`dashboard-nav-item${pathname === item.href ? ' dashboard-nav-item-active' : ''}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}

          <Link href="/dashboard" onClick={() => setOpen(false)} className="dashboard-nav-new">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Project
          </Link>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '6px 0' }} />

          {NAV_BOTTOM.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`dashboard-nav-item${pathname === item.href ? ' dashboard-nav-item-active' : ''}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.15)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Plan</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#A855F7' }}>{plan}</div>
            </div>
            <Link href="/billing" style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, background: 'linear-gradient(90deg,#7C3AED,#C026D3)', color: '#fff', fontWeight: 600, textDecoration: 'none' }}>
              Upgrade
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#C026D3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {initial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              title="Sign out"
              style={{ background: 'none', border: 'none', cursor: signingOut ? 'not-allowed' : 'pointer', color: 'rgba(255,255,255,0.3)', padding: 4, flexShrink: 0, opacity: signingOut ? 0.5 : 1, display: 'flex', alignItems: 'center' }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/Sidebar.tsx app/globals.css
git commit -m "feat: add Sidebar component and dashboard CSS classes"
```

---

## Task 3: StatsCard component

**Files:**
- Create: `components/dashboard/StatsCard.tsx`

- [ ] **Step 1: Create the file**

```tsx
interface StatsCardProps {
  label: string
  value: number
  limit?: number
  unit?: string
}

export default function StatsCard({ label, value, limit, unit }: StatsCardProps) {
  const pct = limit ? Math.min(Math.round((value / limit) * 100), 100) : null

  return (
    <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>
        {value}
        {limit != null && (
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}> / {limit}</span>
        )}
        {unit && limit == null && (
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}> {unit}</span>
        )}
      </div>
      {pct !== null && (
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 10 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#7C3AED,#C026D3)', borderRadius: 2 }} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

## Task 4: UploadZone component

**Files:**
- Create: `components/dashboard/UploadZone.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client'

import { useState } from 'react'

export default function UploadZone() {
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false) }}
      style={{
        border: `2px dashed ${dragOver ? 'rgba(168,85,247,0.6)' : 'rgba(168,85,247,0.3)'}`,
        borderRadius: 14,
        background: dragOver ? 'rgba(168,85,247,0.06)' : 'rgba(168,85,247,0.02)',
        padding: '28px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        textAlign: 'center',
        transition: 'border-color 0.15s, background 0.15s',
        cursor: 'default',
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#A855F7" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>Drop your video here</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>or paste a YouTube / TikTok URL</p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          style={{ padding: '8px 18px', borderRadius: 8, background: 'linear-gradient(90deg,#7C3AED,#C026D3)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Browse files
        </button>
        <button
          style={{ padding: '8px 18px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer' }}
        >
          Paste URL
        </button>
      </div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: 0 }}>MP4, MOV, AVI — max 2GB</p>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

## Task 5: EmptyState and PageHeader components

**Files:**
- Create: `components/dashboard/EmptyState.tsx`
- Create: `components/dashboard/PageHeader.tsx`

- [ ] **Step 1: Create `components/dashboard/EmptyState.tsx`**

```tsx
interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
}

export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div style={{ border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 12, padding: '44px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>{title}</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', margin: 0 }}>{description}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/dashboard/PageHeader.tsx`**

```tsx
interface PageHeaderProps {
  title: string
  description?: string
  breadcrumb: string
}

export default function PageHeader({ title, description, breadcrumb }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '0 0 4px' }}>{breadcrumb}</p>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{title}</h1>
      {description && (
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{description}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/StatsCard.tsx components/dashboard/UploadZone.tsx components/dashboard/EmptyState.tsx components/dashboard/PageHeader.tsx
git commit -m "feat: add dashboard shared components (StatsCard, UploadZone, EmptyState, PageHeader)"
```

---

## Task 6: Update dashboard layout

**Files:**
- Modify: `app/(dashboard)/layout.tsx`

Current content reads user and renders `<>{children}</>`. Replace entirely.

- [ ] **Step 1: Replace `app/(dashboard)/layout.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="dashboard-layout">
      <Sidebar email={user.email ?? ''} plan="FREE" />
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run dev server and verify sidebar appears on /dashboard**

```bash
npm run dev
```

Open http://localhost:3000/dashboard — you should see the sidebar on the left and the current placeholder content on the right. On mobile (<768px), sidebar should be hidden and hamburger button visible.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/layout.tsx"
git commit -m "feat: add sidebar to dashboard layout"
```

---

## Task 7: Home page

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx`

Replace the current 'use client' placeholder with a proper Server Component.

- [ ] **Step 1: Replace `app/(dashboard)/dashboard/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UploadZone from '@/components/dashboard/UploadZone'
import StatsCard from '@/components/dashboard/StatsCard'
import EmptyState from '@/components/dashboard/EmptyState'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ padding: '28px 28px 40px', maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{greeting}! 👋</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Ready to create something viral today?</p>
      </div>

      <UploadZone />

      <div className="dashboard-stats-grid">
        <StatsCard label="Exports left" value={3} limit={3} />
        <StatsCard label="Minutes left" value={30} limit={30} unit="min" />
        <StatsCard label="Clips created" value={0} />
        <StatsCard label="Videos uploaded" value={0} />
      </div>

      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: '0 0 10px' }}>Recent projects</p>
        <EmptyState
          icon={
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="rgba(168,85,247,0.6)" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
            </svg>
          }
          title="No projects yet"
          description="Upload your first video above to get started"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run dev server and verify home page**

```bash
npm run dev
```

Open http://localhost:3000/dashboard. You should see:
- Sidebar on left with logo, nav items, user email, FREE badge
- Right: greeting, upload zone with drag & drop, 4 stat cards, empty state for recent projects

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/dashboard/page.tsx"
git commit -m "feat: implement dashboard home page with upload zone and stats"
```

---

## Task 8: Placeholder pages

**Files:**
- Create: `app/(dashboard)/projects/page.tsx`
- Create: `app/(dashboard)/analytics/page.tsx`
- Create: `app/(dashboard)/billing/page.tsx`
- Create: `app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Create `app/(dashboard)/projects/page.tsx`**

```tsx
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'

export default function ProjectsPage() {
  return (
    <div style={{ padding: '28px 28px 40px' }}>
      <PageHeader
        title="Projects"
        breadcrumb="Dashboard / Projects"
        description="All your video projects and generated clips."
      />
      <EmptyState
        icon={
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="rgba(168,85,247,0.6)" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
          </svg>
        }
        title="Coming soon"
        description="Your processed videos and generated clips will appear here."
      />
    </div>
  )
}
```

- [ ] **Step 2: Create `app/(dashboard)/analytics/page.tsx`**

```tsx
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'

export default function AnalyticsPage() {
  return (
    <div style={{ padding: '28px 28px 40px' }}>
      <PageHeader
        title="Analytics"
        breadcrumb="Dashboard / Analytics"
        description="Track performance and virality scores for your clips."
      />
      <EmptyState
        icon={
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="rgba(168,85,247,0.6)" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
        }
        title="Coming soon"
        description="Analytics will be available once you start creating clips."
      />
    </div>
  )
}
```

- [ ] **Step 3: Create `app/(dashboard)/billing/page.tsx`**

```tsx
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'

export default function BillingPage() {
  return (
    <div style={{ padding: '28px 28px 40px' }}>
      <PageHeader
        title="Billing"
        breadcrumb="Dashboard / Billing"
        description="Manage your subscription and payment details."
      />
      <EmptyState
        icon={
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="rgba(168,85,247,0.6)" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
          </svg>
        }
        title="Coming soon"
        description="Subscription plans and billing will be available here."
      />
    </div>
  )
}
```

- [ ] **Step 4: Create `app/(dashboard)/settings/page.tsx`**

```tsx
import PageHeader from '@/components/dashboard/PageHeader'
import EmptyState from '@/components/dashboard/EmptyState'

export default function SettingsPage() {
  return (
    <div style={{ padding: '28px 28px 40px' }}>
      <PageHeader
        title="Settings"
        breadcrumb="Dashboard / Settings"
        description="Account preferences and connected integrations."
      />
      <EmptyState
        icon={
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="rgba(168,85,247,0.6)" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        }
        title="Coming soon"
        description="Account settings and integrations will be available here."
      />
    </div>
  )
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Run dev server and verify all pages**

```bash
npm run dev
```

Check each route:
- http://localhost:3000/projects — "Projects" with coming soon
- http://localhost:3000/analytics — "Analytics" with coming soon
- http://localhost:3000/billing — "Billing" with coming soon
- http://localhost:3000/settings — "Settings" with coming soon

Each page should show sidebar (with correct nav item highlighted), page header with breadcrumb, and empty state.

- [ ] **Step 7: Verify production build passes**

```bash
npm run build
```

Expected: build completes with no errors.

- [ ] **Step 8: Commit**

```bash
git add "app/(dashboard)/projects/page.tsx" "app/(dashboard)/analytics/page.tsx" "app/(dashboard)/billing/page.tsx" "app/(dashboard)/settings/page.tsx"
git commit -m "feat: add placeholder pages for Projects, Analytics, Billing, Settings"
```
