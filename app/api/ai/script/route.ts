import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateScript, type ScriptPlatform, type ScriptTone } from '@/lib/openai'
import { canUseAITools, type PlanName } from '@/lib/plans'

const VALID_PLATFORMS: ScriptPlatform[] = ['tiktok', 'reels', 'shorts', 'youtube']
const VALID_DURATIONS = ['30s', '60s', '90s']
const VALID_TONES: ScriptTone[] = ['funny', 'educational', 'motivational', 'inspirational']

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', user.id)
    .single()

  const plan = (sub?.plan ?? 'free') as PlanName
  if (!canUseAITools(plan)) {
    return NextResponse.json({ error: 'plan_required', required: 'creator' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const topic = typeof b.topic === 'string' ? b.topic.trim() : ''
  const platform = b.platform as ScriptPlatform
  const duration = b.duration as string
  const tone = b.tone as ScriptTone

  if (!topic) return NextResponse.json({ error: 'topic is required' }, { status: 400 })
  if (topic.length > 500) return NextResponse.json({ error: 'topic too long (max 500 chars)' }, { status: 400 })
  if (!VALID_PLATFORMS.includes(platform)) return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  if (!VALID_DURATIONS.includes(duration)) return NextResponse.json({ error: 'Invalid duration' }, { status: 400 })
  if (!VALID_TONES.includes(tone)) return NextResponse.json({ error: 'Invalid tone' }, { status: 400 })

  try {
    const script = await generateScript(topic, platform, duration, tone)
    return NextResponse.json({ script })
  } catch (err) {
    console.error('[ai/script] generation failed:', err)
    return NextResponse.json({ error: 'Script generation failed' }, { status: 500 })
  }
}
