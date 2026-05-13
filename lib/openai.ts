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
  const wordsCompact = words.slice(0, 500).map(w => ({ t: w.text, s: w.start, e: w.end }))
  const highlightsCompact = highlights.slice(0, 20).map(h => ({ text: h.text, rank: h.rank }))

  const systemPrompt = `You are a viral content expert. Analyze video transcripts to identify the most engaging moments for TikTok, Reels, and YouTube Shorts. Return ONLY valid JSON.`

  const userPrompt = `Analyze this video transcript and identify 3-5 viral clip moments.

Full text:
${truncatedText}

Word timestamps (t=text, s=start_ms, e=end_ms):
${JSON.stringify(wordsCompact)}

Viral phrases detected (hints, ranked 0-1):
${JSON.stringify(highlightsCompact)}

Return a JSON object: {"clips": [...]}

Each clip must have:
- "title": catchy title, max 60 chars
- "start_ms": clip start in milliseconds (use a real "s" value from word timestamps)
- "end_ms": clip end in milliseconds (use a real "e" value from word timestamps)
- "score": virality score 0.0-1.0

Rules:
- 3-5 clips total
- Each clip duration: 15000-60000ms
- No overlapping clips
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
      max_tokens: 500,
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

  return parsed.clips.filter(
    (clip) =>
      typeof clip.title === 'string' &&
      typeof clip.start_ms === 'number' &&
      typeof clip.end_ms === 'number' &&
      typeof clip.score === 'number' &&
      clip.score >= 0 && clip.score <= 1 &&
      clip.end_ms - clip.start_ms >= 15000 &&
      clip.end_ms - clip.start_ms <= 60000
  )
}
