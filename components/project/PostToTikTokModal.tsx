'use client'

import { useState } from 'react'
import type { TikTokPrivacy } from '@/lib/tiktok'

interface PostToTikTokModalProps {
  clipId: string
  defaultTitle: string
  onClose: () => void
}

type PostState = 'idle' | 'posting' | 'done' | 'error'

const PRIVACY_OPTIONS: { value: TikTokPrivacy; label: string }[] = [
  { value: 'PUBLIC_TO_EVERYONE', label: 'Public' },
  { value: 'FOLLOWER_OF_CREATOR', label: 'Followers' },
  { value: 'SELF_ONLY', label: 'Private' },
]

export default function PostToTikTokModal({ clipId, defaultTitle, onClose }: PostToTikTokModalProps) {
  const [title, setTitle] = useState(defaultTitle.slice(0, 150))
  const [privacy, setPrivacy] = useState<TikTokPrivacy>('PUBLIC_TO_EVERYONE')
  const [postState, setPostState] = useState<PostState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handlePost() {
    setPostState('posting')
    try {
      const res = await fetch(`/api/clips/${clipId}/post/tiktok`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, privacyLevel: privacy }),
      })
      const data = await res.json() as { ok?: boolean; publishId?: string; error?: string }
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.16 8.16 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z"/>
            </svg>
            <h3 style={{ color: '#E9D5FF', fontWeight: 700, fontSize: 16, margin: 0 }}>Post to TikTok</h3>
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
                value={title}
                onChange={e => setTitle(e.target.value.slice(0, 150))}
                rows={3}
                maxLength={150}
                placeholder="Add a caption, hashtags..."
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '10px 12px', resize: 'vertical',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.2)',
                  borderRadius: 8, color: '#E9D5FF', fontSize: 13, outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4, textAlign: 'right' }}>{title.length}/150</div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Visibility
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {PRIVACY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPrivacy(opt.value)}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      background: privacy === opt.value ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.04)',
                      border: privacy === opt.value ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.1)',
                      color: privacy === opt.value ? '#E9D5FF' : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {privacy === 'PUBLIC_TO_EVERYONE' && (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: '6px 0 0' }}>
                  Note: in Sandbox mode TikTok posts as private regardless of this setting.
                </p>
              )}
            </div>

            <button
              onClick={() => void handlePost()}
              style={{
                width: '100%', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #7C3AED, #C026D3)',
                color: '#fff', fontWeight: 700, fontSize: 15,
              }}
            >
              Post to TikTok
            </button>
          </>
        )}

        {postState === 'posting' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8 }}>Posting to TikTok...</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>TikTok is processing your video</div>
          </div>
        )}

        {postState === 'done' && (
          <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ color: '#4ADE80', fontSize: 18, fontWeight: 700 }}>Posted to TikTok!</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
              TikTok is processing the video — it will appear in your profile shortly.
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
