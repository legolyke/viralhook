import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { exchangeCode, getUserInfo } from '@/lib/tiktok'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (!code) {
    return NextResponse.redirect(`${appUrl}/settings?error=no_code`)
  }

  const codeVerifier = request.cookies.get('tiktok_cv')?.value
  if (!codeVerifier) {
    return NextResponse.redirect(`${appUrl}/settings?error=tiktok_session_expired`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${appUrl}/login`)

  const admin = createServiceClient()

  try {
    const { access_token, refresh_token, open_id } = await exchangeCode(code, codeVerifier)
    const { openId, displayName } = await getUserInfo(access_token, open_id)

    const { error: upsertError } = await admin.from('social_connections').upsert(
      {
        user_id: user.id,
        platform: 'tiktok',
        access_token,
        refresh_token,
        channel_id: openId,
        channel_name: displayName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform' }
    )

    if (upsertError) {
      console.error('TikTok social_connections upsert error:', upsertError)
      return NextResponse.redirect(`${appUrl}/settings?error=tiktok_failed`)
    }

    const response = NextResponse.redirect(`${appUrl}/settings?connected=tiktok`)
    response.cookies.delete('tiktok_cv')
    return response
  } catch (err) {
    console.error('TikTok callback error:', err)
    return NextResponse.redirect(`${appUrl}/settings?error=tiktok_failed`)
  }
}
