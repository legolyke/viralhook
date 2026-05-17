import { createServiceClient } from '@/lib/supabase/server'
import { type NextRequest } from 'next/server'

export const maxDuration = 60

// Public proxy — serves exported clips via viralhook.media so TikTok URL ownership check passes.
// Only clips with status='ready' are served; R2 URLs are already public.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clipId } = await params

  const svc = createServiceClient()
  const { data: clip } = await svc
    .from('clips')
    .select('file_url, status')
    .eq('id', clipId)
    .single()

  if (!clip || clip.status !== 'ready' || !clip.file_url) {
    return new Response('Not found', { status: 404 })
  }

  const fetchHeaders: Record<string, string> = {}
  const range = request.headers.get('range')
  if (range) fetchHeaders['Range'] = range

  const upstream = await fetch(clip.file_url as string, { headers: fetchHeaders })
  if (!upstream.ok && upstream.status !== 206) {
    return new Response('Failed to fetch video', { status: 502 })
  }

  const responseHeaders = new Headers()
  responseHeaders.set('Content-Type', upstream.headers.get('Content-Type') ?? 'video/mp4')
  const contentLength = upstream.headers.get('Content-Length')
  if (contentLength) responseHeaders.set('Content-Length', contentLength)
  const contentRange = upstream.headers.get('Content-Range')
  if (contentRange) responseHeaders.set('Content-Range', contentRange)
  responseHeaders.set('Accept-Ranges', 'bytes')
  responseHeaders.set('Cache-Control', 'public, max-age=3600')

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders })
}
