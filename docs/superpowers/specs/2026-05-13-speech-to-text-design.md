# Speech-to-Text Engine — Design Spec (Module 5)

## Goal

Automatically transcribe video audio using AssemblyAI when a project is uploaded. Store word-level timestamps and auto-detected highlight phrases. Display the transcript with viral highlights on the project detail page.

## Architecture

### Async Flow

```
/api/upload/confirm
  → set status = 'processing'
  → POST AssemblyAI with R2 public file URL
  → set status = 'transcribing', save job_id to projects.transcript_job_id
  → return { success: true }  (instant response)

AssemblyAI processes async (1–5 min)

POST /api/transcribe/webhook  ← called by AssemblyAI on completion
  → verify HMAC signature
  → save transcript to transcripts table
  → set projects.status = 'ready'
  → return 200

Supabase Realtime notifies browser → project page updates
```

### Why AssemblyAI

- Word-level timestamps (milliseconds precision) — required for clip cutting in Module 7
- `auto_highlights` built-in — detects viral phrases by rank (0–1), feeds Module 6 directly
- Async with webhook — no Vercel timeout issues
- Free tier: 100 hours/month

## Database Changes

### New column on `projects`

```sql
ALTER TABLE projects ADD COLUMN transcript_job_id TEXT;
```

### `transcripts` table (already exists from Module 4)

Stores:
- `full_text` — plain text of entire transcript
- `content` JSONB — words array + auto_highlights array
- `language` — detected language code (e.g. "en")

**Content JSONB shape:**
```json
{
  "words": [
    { "text": "Hey", "start": 240, "end": 480, "confidence": 0.99 }
  ],
  "auto_highlights": [
    {
      "text": "nobody talks about this",
      "rank": 0.92,
      "timestamps": [{ "start": 4200, "end": 5800 }]
    }
  ]
}
```

Timestamps are in milliseconds. `rank` is 0–1; phrases with rank > 0.7 are displayed as highlights.

## Files

### New files

**`lib/assemblyai.ts`**
- `startTranscription(audioUrl: string, webhookUrl: string): Promise<string>` — submits job to AssemblyAI, returns job ID
- `verifyWebhookSignature(body: string, signature: string, secret: string): boolean` — HMAC-SHA256 validation

**`app/api/transcribe/webhook/route.ts`**
- POST handler
- Verifies AssemblyAI webhook signature using `ASSEMBLYAI_WEBHOOK_SECRET`
- On status `completed`: saves transcript to DB, sets project status to `ready`
- On status `error`: sets project status to `error`
- Returns 200 immediately (AssemblyAI retries on non-200)

### Modified files

**`app/api/upload/confirm/route.ts`**
- After setting status `processing`: call `startTranscription(file_url, webhookUrl)`
- Set status to `transcribing`, save returned job ID to `transcript_job_id`
- If AssemblyAI call fails: log error, leave status as `processing` (non-fatal — upload is confirmed)

**`components/project/VideoPlayer.tsx`**
- Add `transcribing` to the spinner states: "Transcribing audio..."

**`app/(dashboard)/projects/[id]/page.tsx`**
- Fetch transcript from `transcripts` table (may be null)
- Render `<TranscriptPanel>` component below video section
- Pass `status`, `transcript` as props

**`components/project/TranscriptPanel.tsx`** (new)
- If status is `transcribing`: spinner + "Transcribing audio... This may take a few minutes"
- If transcript exists: collapsible section showing full text with highlights
  - Phrases with rank > 0.7 rendered with `background: rgba(168,85,247,0.25)`, `border-bottom: 1px solid rgba(168,85,247,0.5)`
- If status is `ready` and no transcript: render nothing (audio-less video or silent failure)

## Environment Variables

| Variable | Purpose |
|---|---|
| `ASSEMBLYAI_API_KEY` | Auth for AssemblyAI API calls (already configured) |
| `ASSEMBLYAI_WEBHOOK_SECRET` | HMAC secret for validating incoming webhooks |
| `NEXT_PUBLIC_APP_URL` | Used to construct webhook URL (e.g. `https://viralhook-chi.vercel.app`) |

## AssemblyAI API Details

**Start transcription request:**
```
POST https://api.assemblyai.com/v2/transcript
Authorization: {ASSEMBLYAI_API_KEY}
{
  "audio_url": "https://r2.viralhook.media/projects/...",
  "auto_highlights": true,
  "webhook_url": "https://viralhook-chi.vercel.app/api/transcribe/webhook",
  "webhook_auth_header_name": "x-assemblyai-signature",
  "webhook_auth_header_value": "{HMAC of job_id}"
}
```

**Webhook payload:**
```json
{
  "transcript_id": "abc123",
  "status": "completed",
  "text": "full transcript...",
  "words": [...],
  "auto_highlights_result": { "results": [...] }
}
```

## Error Handling

- AssemblyAI unreachable at confirm time: log, leave status as `processing`, do not fail the upload response
- Webhook signature invalid: return 401, do not process
- AssemblyAI reports `error` status: set project status to `error`, log transcript_id
- Transcript save fails: return 500 (AssemblyAI will retry webhook)

## Status Flow

```
uploading → processing → transcribing → ready
                                      → error
```

## Testing

- Unit test `verifyWebhookSignature` — valid signature passes, tampered body fails
- Unit test `startTranscription` — mocks fetch, verifies correct payload sent to AssemblyAI
- Integration: manually upload a short video, verify status transitions in Supabase, verify transcript saved
