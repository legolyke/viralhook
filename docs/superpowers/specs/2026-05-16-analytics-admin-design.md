# Analytics Dashboard + Admin Panel (Module 13) — Design Spec

## Goal

Two independent pages: a user-facing `/analytics` dashboard replacing the existing placeholder, and a new `/admin` panel accessible only to the platform owner, showing platform-wide metrics for reporting.

## Architecture

**Approach:** Server Components with direct Supabase queries — no new API routes. User analytics reads with the authenticated user's session (RLS applies). Admin panel reads with `createServiceClient()` (service role, bypasses RLS) — same pattern used in the Module 5 webhook.

```
/analytics  → Server Component → supabase (user session) → user's own data
/admin      → Server Component → createServiceClient()   → all users' data
middleware  → guards /admin → redirect if email ≠ popescu2290@gmail.com
```

**New files:**
- `lib/analytics.ts` — query functions used by both pages
- `app/(dashboard)/admin/page.tsx` — admin panel (new)

**Modified files:**
- `app/(dashboard)/analytics/page.tsx` — replace placeholder
- `middleware.ts` — add /admin guard
- `components/dashboard/Sidebar.tsx` — show Admin link only for owner email

---

## User Analytics (`/analytics`)

### Stat Cards (top row, 4 cards)

| Card | Data Source | Format |
|------|-------------|--------|
| Videos Uploaded | `COUNT(projects) WHERE user_id = user.id` | integer |
| Clips Generated | `COUNT(clips) WHERE user_id = user.id` | integer |
| Exports Used | `subscriptions.exports_used` for user | `N / limit` |
| Avg Virality Score | `AVG(virality_score) FROM clips WHERE user_id = user.id` | `NN%` colored |

Avg virality score color: ≥80% green (#4ADE80), ≥60% yellow (#FCD34D), <60% purple (#C084FC) — same thresholds as ClipsGrid chips.

### Exports Chart (last 30 days)

- Data: clips with `status = 'ready'` grouped by `DATE(updated_at)`, counted per day, for the last 30 days
- Rendered as a minimal SVG bar chart (server-side, no client JS library)
- X axis: last 30 days (only show every 5th label to avoid crowding)
- Y axis: auto-scaled to max value
- Bar color: `rgba(168,85,247,0.6)` (purple, consistent with design system)
- Empty state: "No exports yet" centered text if no data

### Top 3 Clips

- Query: `SELECT id, title, virality_score, start_time, end_time, project_id FROM clips WHERE user_id = user.id ORDER BY virality_score DESC LIMIT 3`
- Each row shows: title (truncated at 50 chars), virality score badge (colored), duration in seconds, project title
- Clicking a clip row navigates to `/projects/[project_id]`
- Empty state: "No clips yet — upload a video to get started"

### Layout

Same dark theme as dashboard. Cards use `rgba(255,255,255,0.02)` background, `rgba(168,85,247,0.15)` border. Mobile: single column stack.

---

## Admin Panel (`/admin`)

### Access Control

`middleware.ts` checks: if path starts with `/admin` and `user.email !== 'popescu2290@gmail.com'` → redirect to `/dashboard`.

Sidebar shows "Admin" link only when `user.email === 'popescu2290@gmail.com'`. Checked client-side from Supabase auth session.

### Users Section

- **Total users:** `COUNT(*)` from `auth.users` via service role
- **By plan:** `SELECT plan, COUNT(*) FROM subscriptions GROUP BY plan`  
- **New users:** COUNT of `auth.users` where `created_at >= today`, `>= 7 days ago`, `>= 30 days ago`

### Revenue Section (estimated)

Calculated in TypeScript from plan counts:

```typescript
const MRR = (creator * 19) + (pro * 49) + (agency * 149)  // EUR
const ARR = MRR * 12
```

Displayed as:
- MRR: `€X,XXX`
- ARR: `€XX,XXX`
- Table: Plan | Users | Price | Monthly Revenue

Free plan contributes €0 — shown in table for completeness.

### Platform Activity Section

- Total projects created (all users): `COUNT(*) FROM projects`
- Total clips generated (all users): `COUNT(*) FROM clips`  
- Total exports performed (all users): `SUM(exports_used) FROM subscriptions`
- Projects created today: `COUNT(*) FROM projects WHERE created_at >= today`
- Projects created this week: `COUNT(*) FROM projects WHERE created_at >= 7 days ago`

### Data Freshness

No caching — fresh Supabase query on every page load. Admin opens this page manually, so stale data is not a concern.

---

## lib/analytics.ts

Exports these functions (used by both pages):

```typescript
// User-scoped (takes supabase client with user session)
getUserStats(supabase, userId): Promise<UserStats>
getExportsByDay(supabase, userId, days: 30): Promise<{ date: string; count: number }[]>
getTopClips(supabase, userId, limit: 3): Promise<TopClip[]>

// Admin-scoped (takes service role client)
getPlatformUserStats(supabase): Promise<PlatformUserStats>
getPlatformActivityStats(supabase): Promise<PlatformActivityStats>
```

---

## Error Handling

- If any query fails, the page renders with `0` / `—` for that metric (no full-page error)
- If user has no subscription row yet → exports shown as `0 / 3` (free default)
- Admin page: if service client fails → show error banner, don't crash

## What Is Not In Scope

- Real-time updates (no polling, no websockets)
- Email notifications or reports
- Exporting data to CSV
- Per-user drill-down in admin (clicking a user to see their projects)
- Charts in admin panel (numbers only)
- Historical MRR tracking
