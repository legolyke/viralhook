'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface PlatformStatus {
  connected: boolean
  channelName?: string
  channelId?: string
}

function PlatformCard({
  name,
  icon,
  connected,
  channelName,
  onConnect,
  onDisconnect,
  comingSoon,
}: {
  name: string
  icon: React.ReactNode
  connected?: boolean
  channelName?: string
  onConnect?: () => void
  onDisconnect?: () => void
  comingSoon?: boolean
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: `1px solid ${connected ? 'rgba(74,222,128,0.3)' : 'rgba(168,85,247,0.15)'}`,
      borderRadius: 12,
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#E9D5FF' }}>{name}</div>
        {connected && channelName && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {channelName}
          </div>
        )}
        {comingSoon && (
          <div style={{ fontSize: 11, color: 'rgba(168,85,247,0.6)', marginTop: 2 }}>API approval pending</div>
        )}
      </div>
      {comingSoon ? (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
          background: 'rgba(168,85,247,0.1)', color: 'rgba(168,85,247,0.6)',
          letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          Coming soon
        </span>
      ) : connected ? (
        <button
          onClick={onDisconnect}
          style={{
            fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8, flexShrink: 0,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#F87171', cursor: 'pointer',
          }}
        >
          Disconnect
        </button>
      ) : (
        <button
          onClick={onConnect}
          style={{
            fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(90deg,#7C3AED,#C026D3)', border: 'none',
            color: '#fff', cursor: 'pointer',
          }}
        >
          Connect
        </button>
      )}
    </div>
  )
}

export default function ConnectedAccounts() {
  const searchParams = useSearchParams()
  const [youtube, setYoutube] = useState<PlatformStatus>({ connected: false })
  const [tiktok, setTiktok] = useState<PlatformStatus>({ connected: false })
  const [instagram, setInstagram] = useState<PlatformStatus>({ connected: false })
  const [banner, setBanner] = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    fetch('/api/social/youtube/status')
      .then(r => r.json())
      .then((data: PlatformStatus) => setYoutube(data))
      .catch(() => {})
    fetch('/api/social/tiktok/status')
      .then(r => r.json())
      .then((data: PlatformStatus) => setTiktok(data))
      .catch(() => {})
    fetch('/api/social/instagram/status')
      .then(r => r.json())
      .then((data: PlatformStatus) => setInstagram(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected === 'youtube') {
      setBanner({ text: 'YouTube connected successfully!', ok: true })
      fetch('/api/social/youtube/status')
        .then(r => r.json())
        .then((data: PlatformStatus) => setYoutube(data))
        .catch(() => {})
    } else if (connected === 'tiktok') {
      setBanner({ text: 'TikTok connected successfully!', ok: true })
      fetch('/api/social/tiktok/status')
        .then(r => r.json())
        .then((data: PlatformStatus) => setTiktok(data))
        .catch(() => {})
    } else if (connected === 'instagram') {
      setBanner({ text: 'Instagram connected successfully!', ok: true })
      fetch('/api/social/instagram/status')
        .then(r => r.json())
        .then((data: PlatformStatus) => setInstagram(data))
        .catch(() => {})
    } else if (error) {
      const msg = error === 'tiktok_session_expired'
        ? 'TikTok session expired. Please try again.'
        : error === 'tiktok_failed'
        ? 'Failed to connect TikTok. Please try again.'
        : error === 'instagram_session_expired'
        ? 'Instagram session expired. Please try again.'
        : error === 'instagram_failed'
        ? 'Failed to connect Instagram. Please try again.'
        : 'Failed to connect. Please try again.'
      setBanner({ text: msg, ok: false })
    }
  }, [searchParams])

  async function handleYoutubeDisconnect() {
    await fetch('/api/social/youtube/disconnect', { method: 'DELETE' })
    setYoutube({ connected: false })
  }

  async function handleTiktokDisconnect() {
    await fetch('/api/social/tiktok/disconnect', { method: 'DELETE' })
    setTiktok({ connected: false })
  }

  async function handleInstagramDisconnect() {
    await fetch('/api/social/instagram/disconnect', { method: 'DELETE' })
    setInstagram({ connected: false })
  }

  return (
    <div>
      {banner && (
        <div style={{
          marginBottom: 16, padding: '10px 16px', borderRadius: 8,
          background: banner.ok ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${banner.ok ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: banner.ok ? '#4ADE80' : '#F87171',
          fontSize: 13,
        }}>
          {banner.text}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PlatformCard
          name="YouTube"
          connected={youtube.connected}
          channelName={youtube.channelName}
          onConnect={() => { window.location.href = '/api/social/youtube/auth' }}
          onDisconnect={() => void handleYoutubeDisconnect()}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#FF0000">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          }
        />
        <PlatformCard
          name="TikTok"
          connected={tiktok.connected}
          channelName={tiktok.channelName}
          onConnect={() => { window.location.href = '/api/social/tiktok/auth' }}
          onDisconnect={() => void handleTiktokDisconnect()}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill={tiktok.connected ? '#fff' : 'rgba(255,255,255,0.7)'}>
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.16 8.16 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z"/>
            </svg>
          }
        />
        <PlatformCard
          name="Instagram"
          connected={instagram.connected}
          channelName={instagram.channelName}
          onConnect={() => { window.location.href = '/api/social/instagram/auth' }}
          onDisconnect={() => void handleInstagramDisconnect()}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill={instagram.connected ? 'url(#ig-settings-grad)' : 'rgba(255,255,255,0.3)'}>
              <defs>
                <linearGradient id="ig-settings-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f09433"/>
                  <stop offset="50%" stopColor="#dc2743"/>
                  <stop offset="100%" stopColor="#bc1888"/>
                </linearGradient>
              </defs>
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
            </svg>
          }
        />
      </div>
    </div>
  )
}
