'use client'

import { useState } from 'react'

interface PostToYouTubeModalProps {
  clipId: string
  defaultTitle: string
  onClose: () => void
}

type PostState = 'idle' | 'posting' | 'done' | 'error'

export default function PostToYouTubeModal({ clipId, defaultTitle, onClose }: PostToYouTubeModalProps) {
  const [title, setTitle] = useState(defaultTitle.slice(0, 100))
  const [description, setDescription] = useState('')
  const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('public')
  const [postState, setPostState] = useState<PostState>('idle')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function handlePost() {
    setPostState('posting')
    try {
      const res = await fetch(`/api/clips/${clipId}/post/youtube`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, privacyStatus: privacy }),
      })
      const data = await res.json() as { ok?: boolean; videoUrl?: string; error?: string }
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? 'Upload failed')
        setPostState('error')
        return
      }
      setVideoUrl(data.videoUrl ?? null)
      setPostState('done')
    } catch {
      setErrorMsg('Network error')
      setPostState('error')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 60, padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: '#0F0F1A', border: '1px solid rgba(168,85,247,0.2)',
        borderRadius: 16, width: '100%', maxWidth: 480, padding: 24,
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#E9D5FF', fontWeight: 700, fontSize: 16, margin: 0 }}>Post to YouTube</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {postState === 'idle' && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Title
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value.slice(0, 100))}
                maxLength={100}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.2)',
                  borderRadius: 8, color: '#E9D5FF', fontSize: 13, outline: 'none',
                }}
              />
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4, textAlign: 'right' }}>{title.length}/100</div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value.slice(0, 5000))}
                rows={4}
                maxLength={5000}
                placeholder="Add a description, hashtags..."
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '10px 12px', resize: 'vertical',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.2)',
                  borderRadius: 8, color: '#E9D5FF', fontSize: 13, outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Privacy
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['public', 'unlisted', 'private'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPrivacy(p)}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      background: privacy === p ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.04)',
                      border: privacy === p ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.1)',
                      color: privacy === p ? '#E9D5FF' : 'rgba(255,255,255,0.4)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => void handlePost()}
              style={{
                width: '100%', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #7C3AED, #C026D3)',
                color: '#fff', fontWeight: 700, fontSize: 15,
              }}
            >
              Post to YouTube
            </button>
          </>
        )}

        {postState === 'posting' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8 }}>Uploading to YouTube...</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>This may take up to 60 seconds</div>
          </div>
        )}

        {postState === 'done' && (
          <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ color: '#4ADE80', fontSize: 18, fontWeight: 700 }}>Posted!</div>
            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', padding: '10px 20px', borderRadius: 8,
                  background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
                  color: '#4ADE80', fontWeight: 600, fontSize: 13, textDecoration: 'none',
                }}
              >
                View on YouTube →
              </a>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        )}

        {postState === 'error' && (
          <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ color: '#F87171', fontSize: 14, fontWeight: 600 }}>Upload failed</div>
            {errorMsg && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{errorMsg}</div>}
            <button
              onClick={() => setPostState('idle')}
              style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(168,85,247,0.3)', background: 'transparent', color: '#C084FC', cursor: 'pointer', fontSize: 13 }}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
