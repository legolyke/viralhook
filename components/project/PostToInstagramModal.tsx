'use client'

import { useState } from 'react'

interface PostToInstagramModalProps {
  clipId: string
  defaultTitle: string
  onClose: () => void
}

type PostState = 'idle' | 'posting' | 'done' | 'error'

export default function PostToInstagramModal({ clipId, defaultTitle, onClose }: PostToInstagramModalProps) {
  const [caption, setCaption] = useState(defaultTitle.slice(0, 2200))
  const [postState, setPostState] = useState<PostState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handlePost() {
    setPostState('posting')
    try {
      const res = await fetch(`/api/clips/${clipId}/post/instagram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption }),
      })
      const data = await res.json() as { ok?: boolean; mediaId?: string; error?: string }
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? 'Post failed')
        setPostState('error')
        return
      }
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="url(#ig-grad)">
              <defs>
                <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f09433"/>
                  <stop offset="25%" stopColor="#e6683c"/>
                  <stop offset="50%" stopColor="#dc2743"/>
                  <stop offset="75%" stopColor="#cc2366"/>
                  <stop offset="100%" stopColor="#bc1888"/>
                </linearGradient>
              </defs>
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
            </svg>
            <h3 style={{ color: '#E9D5FF', fontWeight: 700, fontSize: 16, margin: 0 }}>Post to Instagram</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {postState === 'idle' && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Caption
              </label>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value.slice(0, 2200))}
                rows={4}
                maxLength={2200}
                placeholder="Add a caption, hashtags..."
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '10px 12px', resize: 'vertical',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.2)',
                  borderRadius: 8, color: '#E9D5FF', fontSize: 13, outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4, textAlign: 'right' }}>{caption.length}/2200</div>
            </div>

            <button
              onClick={() => void handlePost()}
              style={{
                width: '100%', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                color: '#fff', fontWeight: 700, fontSize: 15,
              }}
            >
              Post to Instagram
            </button>
          </>
        )}

        {postState === 'posting' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8 }}>Posting to Instagram...</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Instagram is processing your video (up to 50s)</div>
          </div>
        )}

        {postState === 'done' && (
          <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ color: '#4ADE80', fontSize: 18, fontWeight: 700 }}>Posted to Instagram!</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
              Your Reel is now on Instagram.
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        )}

        {postState === 'error' && (
          <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ color: '#F87171', fontSize: 14, fontWeight: 600 }}>Post failed</div>
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
