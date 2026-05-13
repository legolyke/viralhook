# Module 4 — Database & Backend Design

**Date:** 2026-05-13  
**Status:** Approved  
**Project:** ViralHook — AI Viral Shorts Generator

---

## Overview

Module 4 extends the Supabase schema with all tables needed for the AI processing pipeline (Modules 5–10), adds a project detail page `/projects/[id]`, and implements project management API routes (delete, rename). Delete removes data from both Supabase and Cloudflare R2.

---

## Database Schema — New Tables

### `transcripts`
Stores speech-to-text results for a project.

```sql
create table transcripts (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references projects(id) on delete cascade not null,
  user_id         uuid references auth.users(id) on delete cascade not null,
  status          text not null default 'pending',
  -- status: pending | processing | ready | error
  provider        text,
  -- provider: deepgram | assemblyai
  language        text default 'en',
  content         jsonb,
  -- [{ text: string, start: number, end: number, confidence: number }]
  error_message   text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table transcripts enable row level security;
create policy "Users access own transcripts"
  on transcripts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on table transcripts to authenticated;
```

### `clips`
Stores viral clip candidates detected by AI.

```sql
create table clips (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references projects(id) on delete cascade not null,
  user_id         uuid references auth.users(id) on delete cascade not null,
  title           text,
  start_time      numeric not null,
  end_time        numeric not null,
  duration        numeric generated always as (end_time - start_time) stored,
  virality_score  numeric,
  -- 0.0 to 1.0
  hook_text       text,
  status          text not null default 'pending',
  -- status: pending | processing | ready | error
  file_url        text,
  thumbnail_url   text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table clips enable row level security;
create policy "Users access own clips"
  on clips for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on table clips to authenticated;
```

### `exports`
Stores exported final videos.

```sql
create table exports (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references projects(id) on delete cascade not null,
  clip_id         uuid references clips(id) on delete cascade not null,
  user_id         uuid references auth.users(id) on delete cascade not null,
  status          text not null default 'pending',
  -- status: pending | processing | ready | error
  file_url        text,
  format          text default 'mp4',
  resolution      text default '1080x1920',
  -- 1080x1920 (Full HD 9:16) | 720x1280 (HD 9:16)
  has_watermark   boolean default true,
  file_size       bigint,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table exports enable row level security;
create policy "Users access own exports"
  on exports for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on table exports to authenticated;
```

### `subtitles`
Stores generated subtitles for a clip.

```sql
create table subtitles (
  id              uuid primary key default gen_random_uuid(),
  clip_id         uuid references clips(id) on delete cascade not null,
  user_id         uuid references auth.users(id) on delete cascade not null,
  language        text default 'en',
  style           text default 'default',
  -- style: default | bold | minimal | viral
  content         jsonb not null,
  -- [{ text: string, start: number, end: number }]
  created_at      timestamptz default now()
);

alter table subtitles enable row level security;
create policy "Users access own subtitles"
  on subtitles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on table subtitles to authenticated;
```

---

## API Routes

### `DELETE /api/projects/[id]`
Deletes project from Supabase and all associated files from R2.

**Flow:**
1. Verify auth — return 401 if not authenticated
2. Fetch project row — verify `user_id = auth.uid()` (return 404 if not found/not owner)
3. Extract R2 key from `file_url` by stripping `R2_PUBLIC_URL` prefix, then delete from R2
4. Delete project row from Supabase (cascades to transcripts, clips, exports, subtitles)
5. Return 200

**Error handling:** R2 delete failure is logged but does not block DB deletion — orphaned R2 files are acceptable over leaving ghost DB rows.

### `PATCH /api/projects/[id]`
Renames project title.

**Body:** `{ title: string }`  
**Validation:** title must be non-empty string, max 100 characters  
**Flow:**
1. Verify auth
2. Verify ownership
3. Update `title` and `updated_at` in Supabase
4. Return updated project row

---

## Page: `/projects/[id]`

Server component. Fetches project data server-side. Redirects to `/dashboard` if project not found or not owned by current user.

### Sections

**Header**
- Project title (editable inline via client component)
- Status badge (color-coded: uploading=purple, processing=yellow, ready=green, error=red)
- Delete button — opens confirmation dialog before calling DELETE API
- Back link to `/dashboard`

**Video Player**
- HTML5 `<video>` element with `src={project.file_url}`
- Controls enabled, muted by default
- Shown only when `status === 'ready'`
- When `status === 'processing'` or `'uploading'`: shows animated processing indicator

**Metadata Row**
- Source (📁 File / 📺 YouTube / 🎵 TikTok)
- Duration (formatted mm:ss)
- File size (formatted MB/GB)
- Upload date

**AI Clips Section**
- Title: "AI Clips"
- When no clips exist: placeholder grid of 3 skeleton cards with "Processing..." or "Waiting for AI analysis" message
- When clips exist (future modules): grid of clip cards with thumbnail, duration, virality score

---

## Files

| File | Purpose |
|---|---|
| `app/api/projects/[id]/route.ts` | DELETE and PATCH handlers |
| `app/(dashboard)/projects/[id]/page.tsx` | Project detail server component |
| `components/project/ProjectHeader.tsx` | Title + status badge + delete button |
| `components/project/VideoPlayer.tsx` | HTML5 video player with processing state |
| `components/project/ClipsGrid.tsx` | AI clips grid with placeholder state |
| `components/project/DeleteConfirmModal.tsx` | Confirmation dialog for delete |
| `lib/r2.ts` | Add `deleteObject(key)` function |

---

## Out of Scope

- Actual AI clip generation (Module 6)
- Transcript display (Module 5)
- Export functionality (Module 9)
- Subtitle editor (Module 8)
