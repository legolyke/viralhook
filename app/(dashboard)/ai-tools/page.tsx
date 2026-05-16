import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AIToolsPage from '@/components/ai-tools/AIToolsPage'
import type { PlanName } from '@/lib/plans'
import { getVoiceoverLimit } from '@/lib/plans'

export default async function AIToolsPageRoute() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, voiceover_used')
    .eq('user_id', user.id)
    .single()

  const plan = (sub?.plan ?? 'free') as PlanName
  const voiceoverUsed = sub?.voiceover_used ?? 0
  const voiceoverLimit = getVoiceoverLimit(plan)

  return (
    <AIToolsPage
      plan={plan}
      voiceoverUsed={voiceoverUsed}
      voiceoverLimit={voiceoverLimit}
    />
  )
}
