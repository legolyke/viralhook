import type { AssemblyAIWord, AssemblyAIHighlight } from '@/lib/assemblyai'

const OPENAI_BASE = 'https://api.openai.com/v1'

export interface DetectedClip {
  title: string
  start_ms: number
  end_ms: number
  score: number
}

export async function detectViralClips(
  words: AssemblyAIWord[],
  highlights: AssemblyAIHighlight[],
  fullText: string
): Promise<DetectedClip[]> {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set')

  const truncatedText = fullText.slice(0, 8000)
  const wordsCompact = words.slice(0, 500).map(w => ({ word: w.text, start_ms: w.start, end_ms: w.end }))
  const highlightsCompact = highlights.slice(0, 20).map(h => ({ text: h.text, rank: h.rank }))

  const videoDurationMs = words.length > 0 ? words[words.length - 1].end : 0

  const systemPrompt = `You are a viral content expert. Analyze video transcripts to identify the most engaging moments for TikTok, Reels, and YouTube Shorts. Return ONLY valid JSON.`

  const userPrompt = `Analyze this video transcript and identify viral clip moments.

Full transcript text:
${truncatedText}

Word-level timestamps (each word has start_ms and end_ms in milliseconds):
${JSON.stringify(wordsCompact)}

Total video duration: ${videoDurationMs}ms

Viral phrases (hints):
${JSON.stringify(highlightsCompact)}

Return a JSON object: {"clips": [...]}

Each clip must have:
- "title": catchy title, max 60 chars
- "start_ms": start of the clip in milliseconds — must be the start_ms of the FIRST word in the clip segment
- "end_ms": end of the clip in milliseconds — must be the end_ms of the LAST word in the clip segment
- "score": virality score 0.0-1.0

IMPORTANT rules:
- start_ms MUST be less than end_ms
- end_ms - start_ms MUST be between 15000ms and 60000ms (15 to 60 seconds)
- Each clip spans a continuous segment of many words, NOT a single word
- No overlapping clips
- Return 1-5 clips (fewer is fine for short videos)
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
      max_tokens: 1000,
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
      ...clip,
      start_ms: Math.min(clip.start_ms, clip.end_ms),
      end_ms: Math.max(clip.start_ms, clip.end_ms),
    }))
    .filter(
      (clip) =>
        clip.end_ms - clip.start_ms >= 15000 &&
        clip.end_ms - clip.start_ms <= 60000
    )

  console.log('[detectViralClips] filtered count:', normalized.length)
  return normalized
}
