# Module 14 — Auto Posting System: Design Spec

**Data:** 2026-05-16  
**Status:** Aprobat de utilizator

---

## Scopul modulului

Permite utilizatorilor să posteze clipurile exportate direct pe YouTube Shorts din aplicație, fără să descarce și să încarce manual. TikTok și Instagram apar în UI ca "Coming soon" — infrastructura e pregătită pentru ele când API-urile se aprobă.

---

## Planuri & acces

| Plan | YouTube | TikTok | Instagram |
|---|---|---|---|
| FREE | ✅ Post Now | Coming soon | Coming soon |
| CREATOR | ✅ Post Now | Coming soon | Coming soon |
| PRO | ✅ Post Now | Coming soon (activ după aprobare) | Coming soon (activ după aprobare) |
| AGENCY | ✅ Post Now | Coming soon (activ după aprobare) | Coming soon (activ după aprobare) |

Nu există limită separată de postări — dacă clipul e exportat, poate fi postat.  
Scheduled posting se adaugă după lansare (AGENCY only).

---

## Arhitectura

### 1. Settings Page — Connected Accounts

**Fișier:** `app/(dashboard)/settings/page.tsx`  
Înlocuiește "Coming Soon" cu conținut real. Secțiuni:

**Connected Accounts**
- Card YouTube: dacă neconectat → buton "Connect YouTube" (declanșează OAuth). Dacă conectat → "Connected ✓", nume canal, avatar canal, buton "Disconnect".
- Card TikTok: badge "Coming soon — API approval pending", disabled.
- Card Instagram: badge "Coming soon — API approval pending", disabled.

**Export Preferences** (simplu, fără logică complexă)
- Rezoluție default: 1080p / 720p selector (salvat în `profiles` sau localStorage)

### 2. OAuth Flow YouTube

**Route GET** `app/api/social/youtube/auth/route.ts`  
Construiește URL OAuth Google cu scopes:
- `https://www.googleapis.com/auth/youtube.upload`
- `https://www.googleapis.com/auth/youtube.readonly`

Redirect URL: `NEXT_PUBLIC_APP_URL/api/social/youtube/callback`

**Route GET** `app/api/social/youtube/callback/route.ts`  
- Primește `code` din query string
- Exchangeaza `code` → `access_token` + `refresh_token` via Google Token API
- Fetch channel info via YouTube Data API (`channels?part=snippet&mine=true`)
- Salvează în `social_connections`: user_id, platform='youtube', access_token, refresh_token, channel_name, channel_id
- Redirect la `/settings?connected=youtube`

**Route DELETE** `app/api/social/youtube/disconnect/route.ts`  
Șterge rândul din `social_connections` pentru user + platform='youtube'.

### 3. ExportModal — Step "Post to..."

**Fișier:** `components/project/ExportModal.tsx`  
După starea `done` (render terminat, Download disponibil), apare o nouă secțiune "Post to social media".

Butoane platforme:
- **YouTube** — activ dacă `social_connections` există pentru user. Dacă nu e conectat: "Connect first" link spre /settings.
- **TikTok** — întotdeauna disabled + badge "Coming soon".
- **Instagram** — întotdeauna disabled + badge "Coming soon".

Click YouTube → `PostToYouTubeModal` (modal separat, mai simplu):
- Input **Title** (pre-completat cu titlul clipului, editabil, max 100 chars)
- Textarea **Description** (pre-completată cu AI caption dacă există, editabilă, max 5000 chars)
- Select **Privacy**: Public (default) / Unlisted / Private
- Buton **Post to YouTube** → loading → succes cu link YouTube / eroare

### 4. Post API Route

**Route POST** `app/api/clips/[id]/post/youtube/route.ts`  
1. Auth check (user logat)
2. Ownership check (clipul aparține userului)
3. Verifică `clip.file_url` există (clipul e exportat)
4. Fetch `social_connections` pentru user + platform='youtube'
5. Dacă token expirat → refresh via Google Token API, update în DB
6. Upload video pe YouTube via `POST https://www.googleapis.com/upload/youtube/v3/videos`
   - Descarcă clipul din R2 (stream), uploadează direct pe YouTube (resumable upload)
   - Body: `{ snippet: { title, description, categoryId: '22' }, status: { privacyStatus } }`
7. Salvează în `social_posts`: clip_id, user_id, platform, platform_post_id (YouTube video ID), status='posted', posted_at
8. Returnează `{ ok: true, videoId, videoUrl }`

### 5. DB — Tabele noi Supabase

```sql
-- Conexiuni conturi sociale
CREATE TABLE social_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL, -- 'youtube' | 'tiktok' | 'instagram'
  access_token text NOT NULL,
  refresh_token text,
  channel_name text,
  channel_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Postări pe platforme sociale
CREATE TABLE social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id uuid REFERENCES clips(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  platform_post_id text, -- YouTube video ID etc.
  status text DEFAULT 'posted', -- 'posted' | 'failed'
  posted_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own connections" ON social_connections FOR ALL USING (auth.uid() = user_id);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users own posts" ON social_posts FOR ALL USING (auth.uid() = user_id);
```

### 6. Env vars noi (Vercel)

- `GOOGLE_CLIENT_ID` — din Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — din Google Cloud Console

Nu sunt necesare env vars pentru TikTok/Instagram până la aprobare API.

---

## Fișiere de creat/modificat

| Fișier | Acțiune |
|---|---|
| `app/(dashboard)/settings/page.tsx` | Modificat — înlocuit Coming Soon cu Connected Accounts |
| `components/settings/ConnectedAccounts.tsx` | Creat — client component cu carduri platforme |
| `components/settings/YouTubeConnectCard.tsx` | Creat — stare conectat/neconectat, disconnect |
| `app/api/social/youtube/auth/route.ts` | Creat — generare URL OAuth |
| `app/api/social/youtube/callback/route.ts` | Creat — exchange code, salvare tokens |
| `app/api/social/youtube/disconnect/route.ts` | Creat — ștergere conexiune |
| `app/api/clips/[id]/post/youtube/route.ts` | Creat — upload video YouTube |
| `components/project/ExportModal.tsx` | Modificat — adăugat secțiune "Post to..." după done |
| `components/project/PostToYouTubeModal.tsx` | Creat — modal cu titlu, descriere, privacy |
| `lib/youtube.ts` | Creat — funcții: refreshToken, uploadVideo, getChannelInfo |

---

## Securitate

- `access_token` și `refresh_token` stocate în Supabase (RLS — user vede doar ale lui)
- Token refresh automat dacă Google returnează 401
- Ownership verificat pe fiecare API route înainte de orice acțiune
- `GOOGLE_CLIENT_SECRET` doar server-side, niciodată expus în browser

---

## Out of scope (după lansare)

- TikTok posting (pending API approval)
- Instagram posting (pending Meta API approval)
- Scheduled posting (AGENCY feature, post-launch)
- Multi-platform simultaneous posting
- Token refresh proactiv (cron job)
