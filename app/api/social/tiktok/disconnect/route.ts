import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase
    .from('social_connections')
    .delete()
    .eq('user_id', user.id)
    .eq('platform', 'tiktok')

  return NextResponse.json({ ok: true })
}
