import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function toE164(phone: string, dialCode: string): string {
  const digits = phone.replace(/\D/g, '')
  const code = dialCode.replace(/\D/g, '')
  return `+${code}${digits}`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { phone, dial_code } = body as Record<string, unknown>
  if (typeof phone !== 'string' || typeof dial_code !== 'string') {
    return NextResponse.json({ error: 'phone and dial_code required' }, { status: 400 })
  }

  const e164 = toE164(phone, dial_code)
  if (!/^\+\d{7,15}$/.test(e164)) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  }

  // Check uniqueness — phone already used by another user
  const svc = createServiceClient()
  const { data: existing } = await svc.auth.admin.listUsers()
  const taken = existing?.users?.some(
    u => u.phone === e164 && u.id !== user.id
  )
  if (taken) {
    return NextResponse.json({ error: 'Phone already registered' }, { status: 409 })
  }

  const { error } = await supabase.auth.updateUser({ phone: e164 })
  if (error) {
    console.error('[phone] updateUser error', error)
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { phone, dial_code, token } = body as Record<string, unknown>
  if (typeof phone !== 'string' || typeof dial_code !== 'string' || typeof token !== 'string') {
    return NextResponse.json({ error: 'phone, dial_code, token required' }, { status: 400 })
  }

  const e164 = toE164(phone, dial_code)

  const { error } = await supabase.auth.verifyOtp({
    phone: e164,
    token,
    type: 'phone_change',
  })

  if (error) {
    console.error('[phone] verifyOtp error', error)
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
