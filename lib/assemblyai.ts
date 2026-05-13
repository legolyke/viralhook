import { timingSafeEqual } from 'crypto'

const ASSEMBLYAI_BASE = 'https://api.assemblyai.com/v2'

export interface AssemblyAIWord {
  text: string
  start: number
  end: number
  confidence: number
}

export interface AssemblyAIHighlight {
  text: string
  rank: number
  timestamps: Array<{ start: number; end: number }>
}

export interface AssemblyAITranscript {
  id: string
  status: string
  text: string
  words: AssemblyAIWord[]
  auto_highlights_result: { results: AssemblyAIHighlight[] } | null
  language_code: string
}

export async function startTranscription(
  audioUrl: string,
  webhookUrl: string
): Promise<string> {
  if (!process.env.ASSEMBLYAI_API_KEY) throw new Error('ASSEMBLYAI_API_KEY is not set')
  if (!process.env.ASSEMBLYAI_WEBHOOK_SECRET) throw new Error('ASSEMBLYAI_WEBHOOK_SECRET is not set')
  const res = await fetch(`${ASSEMBLYAI_BASE}/transcript`, {
    method: 'POST',
    headers: {
      Authorization: process.env.ASSEMBLYAI_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      auto_highlights: true,
      webhook_url: webhookUrl,
      webhook_auth_header_name: 'x-assemblyai-secret',
      webhook_auth_header_value: process.env.ASSEMBLYAI_WEBHOOK_SECRET,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AssemblyAI error ${res.status}: ${text}`)
  }
  const data = await res.json() as { id: string }
  return data.id
}

export async function getTranscript(transcriptId: string): Promise<AssemblyAITranscript> {
  const res = await fetch(`${ASSEMBLYAI_BASE}/transcript/${transcriptId}`, {
    headers: { Authorization: process.env.ASSEMBLYAI_API_KEY! },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AssemblyAI error ${res.status}: ${text}`)
  }
  return res.json() as Promise<AssemblyAITranscript>
}

export function verifyWebhookSecret(provided: string | null, expected: string): boolean {
  if (!provided || !expected) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
