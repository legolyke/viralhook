import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connected: false })

  const { data } = await supabase
    .from('social_connections')
    .select('channel_name, channel_id')
    .eq('user_id', user.id)
    .eq('platform', 'tiktok')
    .single()

  if (!data) return NextResponse.json({ connected: false })
  return NextResponse.json({ connected: true, channelName: data.channel_name, channelId: data.channel_id })
}
