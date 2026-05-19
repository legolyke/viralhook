'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface VideoPlayerProps {
  fileUrl: string
  status: string
  projectId?: string
  durationSeconds?: number
}

const SPINNER_STATUSES: Record<string, string> = {
  uploading: 'Uploading video...',
  processing: 'Processing video...',
  transcribing: 'Transcribing audio...',
}

const SPINNER_HINTS: Record<string, string> = {
  uploading: 'Your video is being uploaded securely.',
  processing: 'Preparing your video for AI analysis...',
  transcribing: 'Our AI is transcribing your audio and detecting viral moments. This usually takes 1–3 minutes. The page updates automatically.',
}

export default function VideoPlayer({ fileUrl, status, projectId, durationSeconds }: VideoPlayerProps) {
  const router = useRouter()
  const [checking, setChecking] = useState(false)
  const [checkMsg, setCheckMsg] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [autoTriggered, setAutoTriggered] = useState(false)
  const [showButton, setShowButton] = useState(false)

  async function handleGetClips() {
    if (!projectId) return
    setChecking(true)
    setCheckMsg(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/retry-transcription`, { method: 'POST' })
      const data = await res.json() as { status?: string; message?: string; error?: string }
      if (data.status === 'ready') {
        router.refresh()
      } else {
        setCheckMsg(data.message ?? data.error ?? 'Unknown status')
      }
    } catch {
      setCheckMsg('Failed to check status.')
    } finally {
      setChecking(false)
    }
  }

  // Progress bar useEffect
  useEffect(() => {
    if (status !== 'transcribing') return
    const estimatedMs = Math.min(Math.max(30_000, ((durationSeconds ?? 60) / 10) * 1000), 600_000)
    const tickMs = 500
    const step = (tickMs / estimatedMs) * 100
    const id = setInterval(() => {
      setProgress(p => Math.min(100, p + step))
    }, tickMs)
    return () => clearInterval(id)
  }, [status, durationSeconds])

  // Auto-trigger useEffect
  useEffect(() => {
    if (progress < 100 || autoTriggered || !projectId) return
    setAutoTriggered(true)
    fetch(`/api/projects/${projectId}/retry-transcription`, { method: 'POST' })
      .then(r => r.json() as Promise<{ status?: string }>)
      .then(data => {
        if (data.status === 'ready') {
          router.refresh()
        } else {
          setTimeout(() => setShowButton(true), 20_000)
        }
      })
      .catch(() => setTimeout(() => setShowButton(true), 20_000))
  }, [progress, autoTriggered, projectId, router])

  if (status === 'transcribing') {
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(168,85,247,0.1)',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          {/* Status text */}
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0, fontWeight: 500 }}>
            Transcribing audio...
          </p>

          {/* Progress bar */}
          <div style={{ width: '100%', maxWidth: 320 }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, height: 6, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #7C3AED, #C026D3)',
                  borderRadius: 8,
                  transition: 'width 0.5s linear',
                }}
              />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: '6px 0 0', textAlign: 'center' }}>
              {progress < 100 ? `${Math.round(progress)}%` : 'Almost there...'}
            </p>
          </div>

          {/* Hint text */}
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, margin: 0, textAlign: 'center', maxWidth: 420, lineHeight: 1.7 }}>
            Our AI is transcribing your audio and detecting viral moments. The page updates automatically.
          </p>

          {/* Fallback button — only after 20s at 100% */}
          {showButton && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <button
                type="button"
                onClick={handleGetClips}
                disabled={checking}
                style={{
                  padding: '6px 16px',
                  borderRadius: 8,
                  background: 'rgba(168,85,247,0.1)',
                  border: '1px solid rgba(168,85,247,0.25)',
                  color: '#C084FC',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: checking ? 'not-allowed' : 'pointer',
                  opacity: checking ? 0.6 : 1,
                }}
              >
                {checking ? 'Loading...' : 'Get my clips'}
              </button>
              {checkMsg && (
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: 0 }}>
                  {checkMsg}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (status in SPINNER_STATUSES) {
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(168,85,247,0.1)',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            border: '3px solid rgba(168,85,247,0.2)',
            borderTopColor: '#A855F7',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0, fontWeight: 500 }}>
          {SPINNER_STATUSES[status]}
        </p>
        {SPINNER_HINTS[status] && (
          <p style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: 15,
            margin: 0,
            textAlign: 'center',
            maxWidth: 420,
            lineHeight: 1.7,
          }}>
            {SPINNER_HINTS[status]}
          </p>
        )}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          background: 'rgba(239,68,68,0.04)',
          border: '1px solid rgba(239,68,68,0.15)',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ color: '#F87171', fontSize: 14, margin: 0 }}>
          Processing failed. Please try uploading again.
        </p>
      </div>
    )
  }

  return (
    <video
      src={fileUrl ? `${fileUrl}#t=0.001` : undefined}
      controls
      muted
      playsInline
      preload="metadata"
      aria-label="Project video"
      style={{
        width: '100%',
        borderRadius: 16,
        background: '#000',
        maxHeight: 480,
      }}
    >
      Your browser does not support video playback.
    </video>
  )
}
