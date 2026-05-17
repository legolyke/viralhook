import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'
import { verifySignedRequest } from '@/lib/instagram'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const signedRequest = formData.get('signed_request') as string | null
  if (!signedRequest) {
    return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 })
  }

  const data = verifySignedRequest(signedRequest)
  if (!data) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const igUserId = data.user_id as string | undefined
  if (igUserId) {
    const svc = createServiceClient()
    await svc.from('social_connections')
      .delete()
      .eq('channel_id', igUserId)
      .eq('platform', 'instagram')
  }

  const confirmationCode = crypto.randomBytes(8).toString('hex')
  return NextResponse.json({
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/instagram/deletion?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  })
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  return NextResponse.json({ status: 'User data deleted', code })
}
