import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePresignedUploadUrl, getPublicUrl } from '@/lib/r2'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { contentType?: string; size?: number }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { contentType, size } = body
  if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'Only JPG, PNG and WebP images are allowed' }, { status: 400 })
  }
  if (!size || size > MAX_SIZE) {
    return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })
  }

  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg'
  const key = `support/${user.id}/${Date.now()}.${ext}`

  const uploadUrl = await generatePresignedUploadUrl(key, contentType, 300)
  const publicUrl = getPublicUrl(key)

  return NextResponse.json({ uploadUrl, publicUrl })
}
