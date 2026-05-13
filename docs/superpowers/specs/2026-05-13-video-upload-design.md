# Module 3 — Video Upload System Design

**Date:** 2026-05-13  
**Status:** Approved  
**Project:** ViralHook — AI Viral Shorts Generator

---

## Overview

Module 3 adds video ingestion to the platform via two paths: direct file upload (drag & drop) and async URL import (YouTube/TikTok). Uploaded videos are stored in Cloudflare R2. Metadata and project state are persisted in Supabase.

---

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Storage | Cloudflare R2 | Zero egress fees — critical for video platform (files read 4-5x per processing cycle) |
| Upload method | Presigned URLs (direct browser → R2) | Bypasses Vercel 4.5MB body limit; real progress bar; scalable |
| URL import | Async via Railway worker | Vercel 10s timeout too short for yt-dlp downloads |
| File formats | MP4, MOV | Covers 99% of use cases in 2026 |

---

## Plan Limits (per file)

| Plan | Max Duration per File | Monthly Exports |
|---|---|---|
| FREE | 30 minutes | 3 |
| CREATOR | 2 hours | 40 |
| PRO | 4 hours | 150 |
| AGENCY | 6 hours | Unlimited |

---

## Architecture

```
Browser → [Client Validation] → API Route /api/upload/presign → Cloudflare R2
                                          ↓
                                API Route /api/upload/confirm
                                          ↓
                                   Supabase (projects table)

Browser → [Paste URL] → API Route /api/upload/url-import → Railway Worker
                                                                  ↓
                                                     yt-dlp downloads video
                                                                  ↓
                                                          Cloudflare R2
                                                                  ↓
                                                  Supabase Realtime (status update)
```

---

## Database Schema

New table: `projects` in Supabase

```sql
create table projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  title        text not null,
  status       text not null default 'uploading',
  -- status values: uploading | processing | ready | error
  file_url     text,
  file_size    bigint,
  duration_seconds integer,
  source       text not null default 'file',
  -- source values: file | youtube | tiktok
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table projects enable row level security;

create policy "Users can only access their own projects"
  on projects for all
  using (auth.uid() = user_id);
```

---

## Files & Components

### API Routes

| File | Purpose |
|---|---|
| `app/api/upload/presign/route.ts` | Validates plan limits, generates R2 presigned URL, creates project row in Supabase with status `uploading` |
| `app/api/upload/confirm/route.ts` | Called after browser finishes upload; updates project status to `processing` |
| `app/api/upload/url-import/route.ts` | Validates YouTube/TikTok URL, sends job to Railway worker, creates project row with status `uploading` |

### Components

| File | Purpose |
|---|---|
| `components/upload/FileUpload.tsx` | Drag & drop zone + browse button; client-side format/duration validation; XMLHttpRequest upload with real progress bar |
| `components/upload/UrlImport.tsx` | URL input field + submit; status polling via Supabase Realtime |
| `components/upload/UploadModal.tsx` | Modal combining FileUpload and UrlImport with tab switcher |

### Lib

| File | Purpose |
|---|---|
| `lib/r2.ts` | Cloudflare R2 client (S3-compatible via `@aws-sdk/client-s3`) |
| `lib/upload-validator.ts` | Plan limit checks: format validation (MP4/MOV), duration estimate per plan |

---

## UX Flow — File Upload

1. User drags file or clicks "Browse files"
2. **Client validates instantly:**
   - Format must be MP4 or MOV → error: "Only MP4 and MOV files are supported"
   - Duration estimated via browser metadata vs plan limit → error: "Your FREE plan supports max 30 min videos. Upgrade to upload longer content."
3. If valid → progress bar appears: "Preparing upload..."
4. POST to `/api/upload/presign` → receives presigned R2 URL + project ID
5. `XMLHttpRequest.upload.onprogress` → real 0→100% progress bar
6. At 100% → POST to `/api/upload/confirm`
7. Redirect to `/projects/[id]`

---

## UX Flow — URL Import

1. User pastes YouTube or TikTok URL
2. Client validates URL format (must match youtube.com, youtu.be, tiktok.com)
3. POST to `/api/upload/url-import` → job queued on Railway → project created with status `uploading`
4. UI subscribes to Supabase Realtime on `projects` row
5. Status indicators: `uploading` → "Downloading video..." | `processing` → "Processing..." | `ready` → redirect to `/projects/[id]` | `error` → error message
6. Railway worker downloads via yt-dlp, uploads to R2, updates project status via Supabase

---

## Error Handling

| Scenario | Handling |
|---|---|
| Wrong file format | Client-side — instant error before any upload |
| File exceeds plan duration | Client-side — instant error with upgrade CTA |
| R2 upload fails mid-way | Show retry button; project row stays as `uploading` |
| Railway worker fails | Status set to `error`; Realtime notifies UI; user sees "Download failed" + retry |
| Invalid YouTube/TikTok URL | Client-side regex validation before any request |
| Private/unavailable video | Railway catches yt-dlp error, sets status to `error` with message |

---

## Environment Variables Required

```env
# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=viralhook-videos
R2_PUBLIC_URL=https://...

# Railway Worker
RAILWAY_WORKER_URL=
RAILWAY_WORKER_SECRET=
```

---

## Out of Scope (this module)

- Video processing / transcription (Module 5+)
- Subtitle generation (Module 8)
- Export system (Module 9)
- Full YouTube/TikTok URL import Railway worker setup (infrastructure built here, worker implemented in Module 7)
