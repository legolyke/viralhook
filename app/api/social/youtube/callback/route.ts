import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { exchangeCode, getChannelInfo } from '@/lib/youtube'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (!code) {
    return NextResponse.redirect(`${appUrl}/settings?error=no_code`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${appUrl}/login`)

  const admin = createServiceClient()

  try {
    const { access_token, refresh_token } = await exchangeCode(code)
    const { channelId, channelName } = await getChannelInfo(access_token)

    const { error: upsertError } = await admin.from('social_connections').upsert(
      {
        user_id: user.id,
        platform: 'youtube',
        access_token,
        refresh_token,
        channel_id: channelId,
        channel_name: channelName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform' }
    )

    if (upsertError) {
      const msg = encodeURIComponent(upsertError.message.slice(0, 120))
      return NextResponse.redirect(`${appUrl}/settings?error=db_${msg}`)
    }

    return NextResponse.redirect(`${appUrl}/settings?connected=youtube`)
  } catch (err) {
    const msg = encodeURIComponent(err instanceof Error ? err.message.slice(0, 100) : 'unknown')
    return NextResponse.redirect(`${appUrl}/settings?error=${msg}`)
  }
}
