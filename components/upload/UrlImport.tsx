// components/upload/UrlImport.tsx
'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/[\w-]+|tiktok\.com\/.+\/video\/\d+)/

const STATUS_LABELS: Record<string, string> = {
  uploading: 'Downloading video...',
  processing: 'Processing...',
  transcribing: 'Transcribing audio...',
  ready: 'Done! Redirecting...',
  error: 'Import failed.',
}

export default function UrlImport({ projectName = '' }: { projectName?: string }) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!URL_REGEX.test(url)) {
      setError('Please enter a valid YouTube or TikTok URL')
      return
    }

    setIsSubmitting(true)
    const res = await fetch('/api/upload/url-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title: projectName.trim() || undefined }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Import failed')
      setIsSubmitting(false)
      return
    }

    const data = await res.json()
    setProjectId(data.projectId)
    setImportStatus('uploading')
    setIsSubmitting(false)
  }

  useEffect(() => {
    if (!projectId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`project-status-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`,
        },
        (payload) => {
          const newStatus = payload.new.status as string
          setImportStatus(newStatus)
          if (newStatus === 'ready') {
            router.push(`/projects/${projectId}`)
          }
          if (newStatus === 'error') {
            setError('Download failed. The video may be private or unavailable.')
            setProjectId(null)
            setImportStatus(null)
          }
        }
      )
      .subscribe()

    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('projects')
          .select('status')
          .eq('id', projectId)
          .single()
        if (!data) return
        const status = data.status as string
        setImportStatus(status)
        if (status === 'ready') router.push(`/projects/${projectId}`)
        if (status === 'error') {
          setError('Download failed. The video may be private or unavailable.')
          setProjectId(null)
          setImportStatus(null)
        }
      } catch {}
    }, 3000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [projectId, router])

  return (
    <div>
      {!projectId ? (
        <form onSubmit={handleSubmit}>
          <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 12 }}>
            Paste a YouTube or TikTok link to import the video.
          </p>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=... or https://tiktok.com/..."
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(168,85,247,0.25)',
              color: '#fff',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: 12,
            }}
          />
          <button
            type="submit"
            disabled={isSubmitting || !url.trim()}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 12,
              background: isSubmitting ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg, #7C3AED, #C026D3)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: 15,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Queuing...' : 'Import Video'}
          </button>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
          <p style={{ color: '#C084FC', fontWeight: 600 }}>
            {importStatus ? STATUS_LABELS[importStatus] ?? importStatus : 'Queuing...'}
          </p>
          <p style={{ color: '#6B7280', fontSize: 13, marginTop: 8 }}>
            This may take a few minutes. You can close this and check Projects.
          </p>
        </div>
      )}

      {error && (
        <p style={{ color: '#F87171', fontSize: 13, marginTop: 10, textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  )
}
