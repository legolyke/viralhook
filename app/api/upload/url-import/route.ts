import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/
const TIKTOK_REGEX = /^(https?:\/\/)?(www\.)?tiktok\.com\/.+\/video\/\d+/

function detectSource(url: string): 'youtube' | 'tiktok' | null {
  if (YOUTUBE_REGEX.test(url)) return 'youtube'
  if (TIKTOK_REGEX.test(url)) return 'tiktok'
  return null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { url } = await request.json() as { url: string }
  const source = detectSource(url)
  if (!source) {
    return NextResponse.json({ error: 'Invalid YouTube or TikTok URL' }, { status: 400 })
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      title: `Import from ${source === 'youtube' ? 'YouTube' : 'TikTok'}`,
      status: 'uploading',
      source,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }

  // Notify Railway worker if configured (worker implemented in Module 7)
  const workerUrl = process.env.RAILWAY_WORKER_URL
  console.log('[url-import] RAILWAY_WORKER_URL:', workerUrl ?? 'NOT SET')
  console.log('[url-import] RAILWAY_WORKER_SECRET set:', !!process.env.RAILWAY_WORKER_SECRET)
  if (workerUrl) {
    try {
      const workerRes = await fetch(`${workerUrl}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-worker-secret': process.env.RAILWAY_WORKER_SECRET ?? '',
        },
        body: JSON.stringify({ projectId: project.id, url, userId: user.id }),
      })
      const workerBody = await workerRes.text()
      console.log('[url-import] Railway response:', workerRes.status, workerBody)
    } catch (err) {
      console.error('[url-import] Railway fetch failed:', err)
    }
  }

  const debug = {
    workerUrl: process.env.RAILWAY_WORKER_URL ?? 'NOT SET',
    workerSecretSet: !!process.env.RAILWAY_WORKER_SECRET,
  }
  return NextResponse.json({ projectId: project.id, debug })
}
