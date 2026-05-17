import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/instagram'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const state = crypto.randomBytes(16).toString('hex')
  const url = getAuthUrl(state)

  const response = NextResponse.redirect(url)
  response.cookies.set('ig_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return response
}
