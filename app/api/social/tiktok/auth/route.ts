import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateCodeVerifier, generateCodeChallenge, getAuthUrl } from '@/lib/tiktok'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const url = getAuthUrl(codeChallenge)

  const response = NextResponse.redirect(url)
  response.cookies.set('tiktok_cv', codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return response
}
