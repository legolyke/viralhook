import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateVoiceover, type VoiceOption } from '@/lib/openai'
import { canUseVoiceover, isAtVoiceoverLimit, getVoiceoverLimit, type PlanName } from '@/lib/plans'

const VALID_VOICES: VoiceOption[] = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, voiceover_used')
    .eq('user_id', user.id)
    .single()

  const plan = (sub?.plan ?? 'free') as PlanName
  const voiceoverUsed = sub?.voiceover_used ?? 0

  if (!canUseVoiceover(plan)) {
    return NextResponse.json({ error: 'plan_required', required: 'pro' }, { status: 403 })
  }

  if (isAtVoiceoverLimit(plan, voiceoverUsed)) {
    return NextResponse.json({
      error: 'voiceover_limit_reached',
      plan,
      voiceover_used: voiceoverUsed,
      limit: getVoiceoverLimit(plan),
    }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const text = typeof b.text === 'string' ? b.text.trim() : ''
  const voice = b.voice as VoiceOption

  if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 })
  if (text.length > 4000) return NextResponse.json({ error: 'text too long (max 4000 chars)' }, { status: 400 })
  if (!VALID_VOICES.includes(voice)) return NextResponse.json({ error: 'Invalid voice' }, { status: 400 })

  try {
    const audioBuffer = await generateVoiceover(text, voice)

    const admin = createServiceClient()
    await admin
      .from('subscriptions')
      .update({ voiceover_used: voiceoverUsed + 1, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    return new Response(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="voiceover.mp3"',
      },
    })
  } catch (err) {
    console.error('[ai/voiceover] generation failed:', err)
    return NextResponse.json({ error: 'Voiceover generation failed' }, { status: 500 })
  }
}
