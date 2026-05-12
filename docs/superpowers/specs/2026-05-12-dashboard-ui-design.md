# Dashboard UI — Module 2 Design Spec

## Goal

Build the Dashboard UI shell for ViralHook: sidebar navigation, home page with upload zone + stats + empty state, and styled placeholder pages for all other sections.

## Architecture

Next.js nested layouts (Approach A): `app/(dashboard)/layout.tsx` holds the sidebar + content wrapper as a Server Component. Each sub-page renders only its own content. Client components only where interactivity is needed (mobile sidebar toggle, upload zone).

## Scope

**In scope:**
- Sidebar fix (240px) with all navigation items
- Home page: upload zone (visual only, no logic), 4 stat cards, recent projects empty state
- Placeholder pages for: Projects, Analytics, Billing, Settings (each with header + breadcrumb + "coming soon" empty state)
- Responsive: sidebar collapses to hamburger menu on mobile

**Out of scope:**
- Actual upload functionality (Module 3)
- Real stats data from database (Module 4)
- Analytics data (Module 13)
- Billing/Stripe integration (Module 11)

## File Structure

```
app/
  (dashboard)/
    layout.tsx              — sidebar + content wrapper (Server Component)
    dashboard/page.tsx      — home page (replaces current placeholder)
    projects/page.tsx       — projects placeholder
    analytics/page.tsx      — analytics placeholder
    billing/page.tsx        — billing placeholder
    settings/page.tsx       — settings placeholder

components/
  dashboard/
    Sidebar.tsx             — sidebar navigation ('use client' for active state)
    StatsCard.tsx           — reusable stat card with progress bar
    UploadZone.tsx          — drag & drop upload area ('use client')
    EmptyState.tsx          — reusable empty state component
    PageHeader.tsx          — title + breadcrumb for placeholder pages
```

## Design Details

### Colors & Theme
- Background: `#000000`
- Sidebar background: `#080810`
- Sidebar border: `rgba(168,85,247,0.12)`
- Active nav item: `rgba(168,85,247,0.12)` bg + `rgba(168,85,247,0.2)` border
- Purple accent: `#A855F7`
- Purple gradient: `#7C3AED → #C026D3`
- Card background: `rgba(255,255,255,0.02)`, border: `rgba(255,255,255,0.06)`

### Sidebar (240px wide)
**Top:** ViralHook logo (white + purple gradient "Hook")

**Navigation items** (icon 16px + label 13px):
1. Home — active state: purple bg + border
2. Projects
3. **New Project** — special style: gradient border + purple text `#C084FC`, 4px vertical margin
4. *(separator line)*
5. Analytics
6. Billing
7. Settings

**Bottom section** (border-top):
- Plan badge: plan name (FREE/CREATOR/etc.) + "Upgrade" gradient button
- User avatar (initials, gradient circle 28px) + email truncated

### Home Page
**Header:** "Good morning! 👋" h1 + subtitle "Ready to create something viral today?"

**Upload Zone:**
- 2px dashed border `rgba(168,85,247,0.3)`, border-radius 14px
- Icon box 44px, "Drop your video here" title, "or paste a YouTube / TikTok URL" subtitle
- Two buttons: "Browse files" (gradient) + "Paste URL" (border)
- Footer: "MP4, MOV, AVI — max 2GB"

**Stats Cards (4, grid 1fr 1fr 1fr 1fr):**
1. **Exports left** — value/limit + progress bar gradient
2. **Minutes left** — value min + progress bar gradient
3. **Clips created** — count only
4. **Videos uploaded** — count only

**Recent Projects:**
- Section title "Recent projects"
- Empty state: dashed border, "No projects yet — upload your first video above"

### Placeholder Pages (Projects, Analytics, Billing, Settings)
Each page has:
- **PageHeader:** page title (h1, 20px, bold) + breadcrumb "Dashboard / PageName" (12px, muted)
- **Empty state area:** dashed border container, icon box 40px, "Coming soon" title, one-line description of what the page will do

### Mobile Responsive
- Sidebar hidden on mobile, hamburger button top-left
- Content takes full width
- Stats cards: 2x2 grid on mobile (grid-cols-2)
- Upload zone: full width, stacked buttons

## Data (Module 2 — hardcoded placeholders)

Stats cards show hardcoded values from the user's Supabase session:
- Exports left: fetched from `profiles` table (to be created in Module 4), fallback to plan defaults
- For now: hardcode FREE plan defaults (3 exports, 30 min)

The dashboard layout reads `user` from Supabase server client (already works in current `layout.tsx`).
