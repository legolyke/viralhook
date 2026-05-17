import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { exchangeCode, getLongLivedToken, getUserInfo } from '@/lib/instagram'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (!code) {
    return NextResponse.redirect(`${appUrl}/settings?error=instagram_no_code`)
  }

  const storedState = request.cookies.get('ig_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${appUrl}/settings?error=instagram_session_expired`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${appUrl}/login`)

  const admin = createServiceClient()

  try {
    const { access_token: shortToken } = await exchangeCode(code)
    const longToken = await getLongLivedToken(shortToken)
    const { userId, username } = await getUserInfo(longToken)

    const { error: upsertError } = await admin.from('social_connections').upsert(
      {
        user_id: user.id,
        platform: 'instagram',
        access_token: longToken,
        refresh_token: '',
        channel_id: userId,
        channel_name: `@${username}`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform' }
    )

    if (upsertError) {
      console.error('Instagram social_connections upsert error:', upsertError)
      return NextResponse.redirect(`${appUrl}/settings?error=instagram_failed`)
    }

    const response = NextResponse.redirect(`${appUrl}/settings?connected=instagram`)
    response.cookies.delete('ig_state')
    return response
  } catch (err) {
    console.error('Instagram callback error:', err)
    return NextResponse.redirect(`${appUrl}/settings?error=instagram_failed`)
  }
}
