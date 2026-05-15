import type { AssemblyAIWord, AssemblyAIHighlight } from '@/lib/assemblyai'

const OPENAI_BASE = 'https://api.openai.com/v1'

export type CaptionPlatform = 'tiktok' | 'reels' | 'shorts' | 'youtube'

export async function generateCaption(
  clipText: string,
  platform: CaptionPlatform,
  language = 'en'
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set')

  const platformGuides: Record<CaptionPlatform, string> = {
    tiktok: 'TikTok — casual, trendy tone, start with a hook (POV:, Nobody:, etc.), 3–5 trending hashtags, keep caption punchy and under 200 chars',
    reels: 'Instagram Reels — visually descriptive, use 2–3 emojis naturally, engaging CTA, 3–5 relevant hashtags at the end',
    shorts: 'YouTube Shorts — punchy title-style caption, include #Shorts plus 2–3 topic hashtags',
    youtube: 'YouTube — SEO-optimized description, put keywords in the first 2 lines, add 3–5 hashtags at the very end',
  }

  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a social media expert who writes viral captions. Always write in the same language as the transcript (language code: ${language}). Return ONLY the caption — no explanations, no quotes around it.`,
        },
        {
          role: 'user',
          content: `Write a caption for this video clip to post on ${platformGuides[platform]}.\n\nClip transcript:\n${clipText.slice(0, 3000)}`,
        },
      ],
      temperature: 0.75,
      max_tokens: 300,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI error ${res.status}: ${text}`)
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  const content = data.choices[0]?.message?.content?.trim()
  if (!content) throw new Error('OpenAI returned empty response')
  return content
}

export interface ScoreComponent {
  score: number
  reason: string
}

export interface ScoreBreakdown {
  hook:          ScoreComponent
  emotion:       ScoreComponent
  pacing:        ScoreComponent
  shareability:  ScoreComponent
}

export interface DetectedClip {
  title:     string
  start_ms:  number
  end_ms:    number
  score:     number
  breakdown: ScoreBreakdown | null
}

function validateBreakdown(raw: unknown): ScoreBreakdown | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  const keys = ['hook', 'emotion', 'pacing', 'shareability'] as const
  const result = {} as ScoreBreakdown
  for (const key of keys) {
    const comp = b[key]
    if (!comp || typeof comp !== 'object') return null
    const c = comp as Record<string, unknown>
    if (typeof c.score !== 'number' || c.score < 0 || c.score > 1) return null
    if (typeof c.reason !== 'string' || !c.reason) return null
    result[key] = { score: c.score, reason: c.reason }
  }
  return result
}

export async function detectViralClips(
  words: AssemblyAIWord[],
  highlights: AssemblyAIHighlight[],
  fullText: string,
  language = 'en'
): Promise<DetectedClip[]> {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set')

  const truncatedText = fullText.slice(0, 8000)
  const highlightsCompact = highlights.slice(0, 20).map(h => ({ text: h.text, rank: h.rank }))
  const videoDurationMs = words.length > 0 ? words[words.length - 1].end : 0

  // Build a sparse timeline: one entry every ~5 seconds so GPT can reason about clip boundaries
  const BUCKET_MS = 5000
  const timelineMap = new Map<number, string[]>()
  for (const w of words) {
    const bucket = Math.floor(w.start / BUCKET_MS) * BUCKET_MS
    if (!timelineMap.has(bucket)) timelineMap.set(bucket, [])
    timelineMap.get(bucket)!.push(w.text)
  }
  const timeline = Array.from(timelineMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([time_ms, ws]) => ({ time_ms, text: ws.join(' ') }))

  const systemPrompt = `You are a viral content expert. Analyze video transcripts to identify the most engaging moments for TikTok, Reels, and YouTube Shorts. Return ONLY valid JSON. Always write titles in the same language as the transcript (language code: ${language}).`

  const userPrompt = `Analyze this video transcript and identify viral clip moments.

Full transcript:
${truncatedText}

Video duration: ${videoDurationMs}ms (${Math.round(videoDurationMs / 1000)} seconds)

Timeline — what is said around each 5-second mark:
${JSON.stringify(timeline)}

Viral phrases detected (hints):
${JSON.stringify(highlightsCompact)}

Return a JSON object: {"clips": [...]}

Each clip must have:
- "title": catchy title, max 60 chars
- "start_ms": use a time_ms value from the timeline above as the clip start
- "end_ms": use a time_ms value from the timeline above as the clip end (must be at least 3 entries after start_ms)
- "score": overall virality score 0.0-1.0 (weighted average of breakdown scores)
- "breakdown": object with exactly four keys, each having "score" (0.0-1.0) and "reason" (1-2 sentences in English):
  - "hook": how strong the opening seconds are at grabbing attention
  - "emotion": how much emotion and energy the clip conveys
  - "pacing": how well-timed the clip is — not too slow, not too fast
  - "shareability": how likely viewers are to share or forward this clip

Rules:
- start_ms MUST be less than end_ms
- end_ms - start_ms MUST be between 15000 and 60000 (15 to 60 seconds)
- No overlapping clips
- Return 1-5 clips (1 clip is fine for a short video)
- Prioritize: emotional moments, humor, surprise, quotable phrases`

  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(25000),
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI error ${res.status}: ${text}`)
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  const content = data.choices[0]?.message?.content
  if (!content) throw new Error('OpenAI returned empty response')

  let parsed: { clips: DetectedClip[] }
  try {
    parsed = JSON.parse(content) as { clips: DetectedClip[] }
  } catch {
    throw new Error('OpenAI returned invalid JSON')
  }

  if (!Array.isArray(parsed.clips)) throw new Error('OpenAI response missing clips array')

  console.log('[detectViralClips] raw clips from GPT:', JSON.stringify(parsed.clips))

  const normalized = parsed.clips
    .filter(
      (clip) =>
        typeof clip.title === 'string' &&
        typeof clip.start_ms === 'number' &&
        typeof clip.end_ms === 'number' &&
        typeof clip.score === 'number' &&
        clip.score >= 0 && clip.score <= 1
    )
    .map((clip) => ({
      title:     clip.title,
      start_ms:  Math.min(clip.start_ms, clip.end_ms),
      end_ms:    Math.max(clip.start_ms, clip.end_ms),
      score:     clip.score,
      breakdown: validateBreakdown((clip as unknown as Record<string, unknown>).breakdown),
    }))
    .filter(
      (clip) =>
        clip.end_ms - clip.start_ms >= 15000 &&
        clip.end_ms - clip.start_ms <= 60000
    )

  console.log('[detectViralClips] filtered count:', normalized.length)
  return normalized
}
