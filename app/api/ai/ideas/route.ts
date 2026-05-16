import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateIdeas, type ScriptPlatform } from '@/lib/openai'
import { canUseAITools, type PlanName } from '@/lib/plans'

const VALID_PLATFORMS: ScriptPlatform[] = ['tiktok', 'reels', 'shorts', 'youtube']

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
  const niche = typeof b.niche === 'string' ? b.niche.trim() : ''
  const platform = b.platform as ScriptPlatform

  if (!niche) return NextResponse.json({ error: 'niche is required' }, { status: 400 })
  if (niche.length > 300) return NextResponse.json({ error: 'niche too long (max 300 chars)' }, { status: 400 })
  if (!VALID_PLATFORMS.includes(platform)) return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })

  try {
    const ideas = await generateIdeas(niche, platform)
    return NextResponse.json({ ideas })
  } catch (err) {
    console.error('[ai/ideas] generation failed:', err)
    return NextResponse.json({ error: 'Idea generation failed' }, { status: 500 })
  }
}
