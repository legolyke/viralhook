'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PhoneVerifyModal from '@/components/phone/PhoneVerifyModal'
import UpsellModal from '@/components/billing/UpsellModal'

const SUBTITLE_FONTS = [
  { key: 'arial',            name: 'Arial',             css: 'Arial, sans-serif' },
  { key: 'roboto',           name: 'Roboto',            css: "'Roboto', sans-serif" },
  { key: 'open-sans',        name: 'Open Sans',         css: "'Open Sans', sans-serif" },
  { key: 'lato',             name: 'Lato',              css: "'Lato', sans-serif" },
  { key: 'montserrat',       name: 'Montserrat',        css: "'Montserrat', sans-serif" },
  { key: 'poppins',          name: 'Poppins',           css: "'Poppins', sans-serif" },
  { key: 'nunito',           name: 'Nunito',            css: "'Nunito', sans-serif" },
  { key: 'ubuntu',           name: 'Ubuntu',            css: "'Ubuntu', sans-serif" },
  { key: 'raleway',          name: 'Raleway',           css: "'Raleway', sans-serif" },
  { key: 'inter',            name: 'Inter',             css: "'Inter', sans-serif" },
  { key: 'oswald',           name: 'Oswald',            css: "'Oswald', sans-serif" },
  { key: 'anton',            name: 'Anton',             css: "'Anton', sans-serif" },
  { key: 'bebas-neue',       name: 'Bebas Neue',        css: "'Bebas Neue', sans-serif" },
  { key: 'russo-one',        name: 'Russo One',         css: "'Russo One', sans-serif" },
  { key: 'teko',             name: 'Teko',              css: "'Teko', sans-serif" },
  { key: 'barlow-condensed', name: 'Barlow Condensed',  css: "'Barlow Condensed', sans-serif" },
  { key: 'righteous',        name: 'Righteous',         css: "'Righteous', sans-serif" },
  { key: 'fredoka-one',      name: 'Fredoka One',       css: "'Fredoka One', sans-serif" },
  { key: 'playfair',         name: 'Playfair Display',  css: "'Playfair Display', serif" },
  { key: 'merriweather',     name: 'Merriweather',      css: "'Merriweather', serif" },
  { key: 'pacifico',         name: 'Pacifico',          css: "'Pacifico', cursive" },
  { key: 'dancing-script',   name: 'Dancing Script',    css: "'Dancing Script', cursive" },
  { key: 'permanent-marker', name: 'Permanent Marker',  css: "'Permanent Marker', cursive" },
  { key: 'bangers',          name: 'Bangers',           css: "'Bangers', cursive" },
]

const GOOGLE_FONTS_URL = [
  'Roboto:wght@700', 'Open+Sans:wght@700', 'Lato:wght@700', 'Montserrat:wght@700',
  'Poppins:wght@700', 'Nunito:wght@800', 'Ubuntu:wght@700', 'Raleway:wght@700',
  'Inter:wght@700', 'Oswald:wght@700', 'Anton', 'Bebas+Neue', 'Russo+One',
  'Teko:wght@700', 'Barlow+Condensed:wght@700', 'Righteous', 'Fredoka+One',
  'Playfair+Display:wght@700', 'Merriweather:wght@700', 'Pacifico',
  'Dancing+Script:wght@700', 'Permanent+Marker', 'Bangers',
].map(f => `family=${f}`).join('&')

const SELECT_STYLE: React.CSSProperties = {
  background: 'rgba(15,15,26,0.9)',
  border: '1px solid rgba(168,85,247,0.3)',
  borderRadius: 8,
  color: '#E9D5FF',
  fontSize: 13,
  padding: '6px 28px 6px 10px',
  cursor: 'pointer',
  outline: 'none',
  appearance: 'none' as const,
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23A855F7'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
}

interface ExportModalProps {
  clipId: string
  startTime: number
  endTime: number
  projectFileUrl: string
  onClose: () => void
}

type ModalState = 'crop' | 'processing' | 'done' | 'error'

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

export default function ExportModal({ clipId, startTime, endTime, projectFileUrl, onClose }: ExportModalProps) {
  const [state, setState] = useState<ModalState>('crop')
  const [showPhone, setShowPhone] = useState(false)
  const [upsellData, setUpsellData] = useState<{ plan: string; exports_used: number; limit: number } | null>(null)
  const [cropX, setCropX] = useState(0.5)
  const [progress, setProgress] = useState(0)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartCropX, setDragStartCropX] = useState(0.5)
  const [videoNaturalWidth, setVideoNaturalWidth] = useState(1920)
  const [videoNaturalHeight, setVideoNaturalHeight] = useState(1080)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p')
  const [subtitleEnabled, setSubtitleEnabled] = useState(false)
  const [subtitlePosition, setSubtitlePosition] = useState<'bottom' | 'top'>('bottom')
  const [subtitleFontSize, setSubtitleFontSize] = useState(40)
  const [subtitleColor, setSubtitleColor] = useState('#FFFFFF')
  const [subtitleFont, setSubtitleFont] = useState('arial')

  // Load Google Fonts for preview
  useEffect(() => {
    const id = 'vh-subtitle-fonts'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?${GOOGLE_FONTS_URL}&display=swap`
    document.head.appendChild(link)
  }, [])

  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollStartRef = useRef<number>(0)

  // Seek to clip start when entering crop state
  useEffect(() => {
    if (state === 'crop' && videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = startTime / 1000
      setIsPlaying(false)
    }
  }, [state, startTime])

  // Progress bar fill during processing
  useEffect(() => {
    if (state !== 'processing') return
    const durationMs = endTime - startTime
    const estimatedMs = Math.max(10000, durationMs * 1.5)
    const intervalMs = 200
    const step = (intervalMs / estimatedMs) * 90
    setProgress(0)
    progressIntervalRef.current = setInterval(() => {
      setProgress(p => Math.min(p + step, 90))
    }, intervalMs)
    return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current) }
  }, [state, startTime, endTime])

  // Poll Supabase directly from browser (bypasses Next.js status route)
  useEffect(() => {
    if (state !== 'processing') return
    pollStartRef.current = Date.now()

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const supabase = createClient()

    const poll = async () => {
      if (cancelled) return

      if (Date.now() - pollStartRef.current > 5 * 60 * 1000) {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
        setErrorMsg('Processing timed out after 5 minutes.')
        setState('error')
        return
      }

      try {
        const { data: clip, error } = await supabase
          .from('clips')
          .select('status, file_url')
          .eq('id', clipId)
          .single()

        if (cancelled) return

        if (error || !clip) {
          if (!cancelled) timeoutId = setTimeout(poll, 3000)
          return
        }

        if (clip.status === 'ready') {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
          setProgress(100)
          setFileUrl((clip.file_url as string | null) ?? null)
          setState('done')
        } else if (clip.status === 'error') {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
          setErrorMsg('Processing failed on the server.')
          setState('error')
        } else {
          if (!cancelled) timeoutId = setTimeout(poll, 3000)
        }
      } catch {
        if (!cancelled) timeoutId = setTimeout(poll, 3000)
      }
    }

    timeoutId = setTimeout(poll, 3000)
    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [state, clipId])

  // Drag: mousemove + mouseup on window
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const containerWidth = containerRef.current.getBoundingClientRect().width
      const aspectRatio = videoNaturalWidth / videoNaturalHeight
      const cropBoxWidthRatio = (9 / 16) / aspectRatio
      const maxPx = containerWidth * (1 - cropBoxWidthRatio)
      if (maxPx <= 0) return
      const delta = (e.clientX - dragStartX) / maxPx
      setCropX(Math.min(1, Math.max(0, dragStartCropX + delta)))
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current || !e.touches[0]) return
      const containerWidth = containerRef.current.getBoundingClientRect().width
      const aspectRatio = videoNaturalWidth / videoNaturalHeight
      const cropBoxWidthRatio = (9 / 16) / aspectRatio
      const maxPx = containerWidth * (1 - cropBoxWidthRatio)
      if (maxPx <= 0) return
      const delta = (e.touches[0].clientX - dragStartX) / maxPx
      setCropX(Math.min(1, Math.max(0, dragStartCropX + delta)))
    }

    const handleUp = () => setIsDragging(false)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [isDragging, dragStartX, dragStartCropX, videoNaturalWidth, videoNaturalHeight])

  const handleGenerate = async () => {
    setState('processing')
    try {
      const res = await fetch(`/api/clips/${clipId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop_x: cropX,
          resolution,
          subtitle_style: subtitleEnabled ? {
            enabled: true,
            position: subtitlePosition,
            font_size: subtitleFontSize,
            color: subtitleColor,
            font: subtitleFont,
          } : null,
        }),
      })
      if (res.status === 403) {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
        const data = await res.json() as { error?: string; plan?: string; exports_used?: number; limit?: number }
        if (data.error === 'phone_required') {
          setState('crop')
          setShowPhone(true)
          return
        }
        if (data.error === 'limit_reached') {
          setState('crop')
          setUpsellData({ plan: data.plan ?? '', exports_used: data.exports_used ?? 0, limit: data.limit ?? 0 })
          return
        }
        setErrorMsg(data.error ?? 'Access denied.')
        setState('error')
        return
      }
      if (!res.ok) {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
        const data = await res.json() as { error?: string }
        setErrorMsg(data.error ?? 'Failed to start generation.')
        setState('error')
      }
      // if ok: polling useEffect takes over
    } catch (err) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      setErrorMsg(err instanceof Error ? err.message : 'Network error')
      setState('error')
    }
  }

  const handleDownload = async () => {
    if (!fileUrl || isDownloading) return
    setIsDownloading(true)
    try {
      const res = await fetch(fileUrl)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clip-${clipId}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // fallback: open in new tab
      window.open(fileUrl, '_blank')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleReset = () => {
    setState('crop')
    setCropX(0.5)
    setErrorMsg('')
    setProgress(0)
    setFileUrl(null)
  }

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.currentTime = startTime / 1000
      void videoRef.current.play()
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    const next = !isMuted
    videoRef.current.muted = next
    setIsMuted(next)
  }

  const aspectRatio = videoNaturalWidth / videoNaturalHeight
  const cropBoxWidthRatio = (9 / 16) / aspectRatio
  const canDrag = cropBoxWidthRatio < 0.99

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 50,
    padding: 16,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  }

  const modalStyle: React.CSSProperties = {
    background: '#0F0F1A',
    border: '1px solid rgba(168,85,247,0.2)',
    borderRadius: 16,
    width: '100%',
    maxWidth: 640,
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    marginTop: 'auto',
    marginBottom: 'auto',
    overflow: 'hidden',
  }

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modalStyle}>
        {/* Sticky header — always visible */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 24px 12px',
          borderBottom: '1px solid rgba(168,85,247,0.1)',
          background: '#0F0F1A',
          flexShrink: 0,
        }}>
          <h3 style={{ color: '#E9D5FF', fontWeight: 700, fontSize: 16, margin: 0 }}>Export Clip</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.7)',
              fontSize: 18,
              cursor: 'pointer',
              lineHeight: 1,
              padding: '6px 10px',
              minWidth: 36,
              minHeight: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '20px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>

        {/* State: crop selector */}
        {state === 'crop' && (
          <>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>
              {canDrag ? 'Drag to position the crop area for your 9:16 clip' : 'Video is already 9:16 — full width will be used'}
            </p>

            <div
              ref={containerRef}
              style={{
                position: 'relative',
                width: '100%',
                height: 'clamp(200px, 55vw, 320px)',
                borderRadius: 8,
                overflow: 'hidden',
                background: '#000',
                cursor: canDrag ? 'ew-resize' : 'default',
              }}
            >
              <video
                ref={videoRef}
                src={projectFileUrl}
                muted={isMuted}
                playsInline
                preload="metadata"
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget
                  setVideoNaturalWidth(v.videoWidth || 1920)
                  setVideoNaturalHeight(v.videoHeight || 1080)
                  v.currentTime = startTime / 1000
                }}
                onTimeUpdate={(e) => {
                  if (e.currentTarget.currentTime >= endTime / 1000) {
                    e.currentTarget.pause()
                    e.currentTarget.currentTime = startTime / 1000
                  }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />

              <div
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: `${cropX * (1 - cropBoxWidthRatio) * 100}%`,
                  height: '100%', background: 'rgba(0,0,0,0.55)', pointerEvents: 'none',
                }}
              />

              <div
                onMouseDown={(e) => {
                  if (!canDrag) return
                  e.preventDefault()
                  setIsDragging(true)
                  setDragStartX(e.clientX)
                  setDragStartCropX(cropX)
                }}
                onTouchStart={(e) => {
                  if (!canDrag || !e.touches[0]) return
                  setIsDragging(true)
                  setDragStartX(e.touches[0].clientX)
                  setDragStartCropX(cropX)
                }}
                style={{
                  position: 'absolute', top: 0,
                  left: `${cropX * (1 - cropBoxWidthRatio) * 100}%`,
                  width: `${cropBoxWidthRatio * 100}%`,
                  height: '100%',
                  border: '2px solid #A855F7',
                  boxSizing: 'border-box',
                  cursor: canDrag ? 'ew-resize' : 'default',
                }}
              />

              <div
                style={{
                  position: 'absolute', top: 0, right: 0,
                  width: `${(1 - cropX * (1 - cropBoxWidthRatio) - cropBoxWidthRatio) * 100}%`,
                  height: '100%', background: 'rgba(0,0,0,0.55)', pointerEvents: 'none',
                }}
              />

              <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 10, display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={togglePlay}
                  style={{
                    background: 'rgba(0,0,0,0.72)', border: '1px solid rgba(255,255,255,0.18)',
                    borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '5px 12px', fontSize: 16, lineHeight: 1,
                  }}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  style={{
                    background: 'rgba(0,0,0,0.72)', border: '1px solid rgba(255,255,255,0.18)',
                    borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '5px 12px', fontSize: 16, lineHeight: 1,
                  }}
                >
                  {isMuted ? '🔇' : '🔊'}
                </button>
              </div>

              <div
                style={{
                  position: 'absolute', bottom: 12, right: 12, zIndex: 10,
                  background: 'rgba(0,0,0,0.72)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, padding: '4px 10px', fontSize: 12,
                  color: 'rgba(255,255,255,0.75)', pointerEvents: 'none',
                }}
              >
                {formatTime(startTime)} → {formatTime(endTime)}
              </div>

              {/* Subtitle preview overlay */}
              {subtitleEnabled && (
                <div style={{
                  position: 'absolute',
                  ...(subtitlePosition === 'top' ? { top: 28 } : { bottom: 44 }),
                  left: 0, right: 0, zIndex: 15,
                  textAlign: 'center', pointerEvents: 'none', padding: '0 16px',
                }}>
                  <span style={{
                    color: subtitleColor,
                    fontSize: Math.max(8, Math.round(subtitleFontSize * 0.35)),
                    fontWeight: 700,
                    fontFamily: SUBTITLE_FONTS.find(f => f.key === subtitleFont)?.css ?? 'Arial, sans-serif',
                    textShadow: '0 0 4px #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                    lineHeight: 1.3,
                  }}>
                    Sample subtitle text
                  </span>
                </div>
              )}
            </div>

            {/* Resolution */}
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>
                Resolution
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {([
                  { value: '720p',  label: '720p',  desc: 'HD' },
                  { value: '1080p', label: '1080p', desc: 'Full HD' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setResolution(opt.value)}
                    style={{
                      padding: '10px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                      background: resolution === opt.value ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.04)',
                      border: resolution === opt.value ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13, color: resolution === opt.value ? '#E9D5FF' : 'rgba(255,255,255,0.5)' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 11, color: resolution === opt.value ? 'rgba(233,213,255,0.55)' : 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Subtitle options */}
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>
                Subtitles
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { value: false, title: 'SRT file only', desc: 'Download .srt after export' },
                  { value: true,  title: 'Burn into video', desc: 'Embed subtitles in the clip' },
                ].map(opt => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setSubtitleEnabled(opt.value)}
                    style={{
                      padding: '12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      background: subtitleEnabled === opt.value ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.04)',
                      border: subtitleEnabled === opt.value ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13, color: subtitleEnabled === opt.value ? '#E9D5FF' : 'rgba(255,255,255,0.5)', marginBottom: 3 }}>
                      {opt.title}
                    </div>
                    <div style={{ fontSize: 11, color: subtitleEnabled === opt.value ? 'rgba(233,213,255,0.55)' : 'rgba(255,255,255,0.25)', lineHeight: 1.4 }}>
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>

              {subtitleEnabled && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>

                  {/* Row 1: Position + Font */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, flexShrink: 0 }}>Position</span>
                      <select value={subtitlePosition} onChange={e => setSubtitlePosition(e.target.value as 'bottom' | 'top')} style={SELECT_STYLE}>
                        <option value="bottom">Bottom</option>
                        <option value="top">Top</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, flexShrink: 0 }}>Font</span>
                      <select value={subtitleFont} onChange={e => setSubtitleFont(e.target.value)} style={{ ...SELECT_STYLE, flex: 1, minWidth: 0 }}>
                        {SUBTITLE_FONTS.map(f => (
                          <option key={f.key} value={f.key}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Size + Color */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, flexShrink: 0 }}>Size</span>
                      <select value={subtitleFontSize} onChange={e => setSubtitleFontSize(Number(e.target.value))} style={SELECT_STYLE}>
                        {Array.from({ length: 34 }, (_, i) => 4 + i * 2).map(s => (
                          <option key={s} value={s}>{s}px</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, flexShrink: 0 }}>Color</span>
                      <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
                          background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                          border: '2px solid rgba(255,255,255,0.2)',
                        }} />
                        <input
                          type="color"
                          value={subtitleColor}
                          onChange={e => setSubtitleColor(e.target.value)}
                          style={{
                            position: 'absolute', inset: 0, opacity: 0,
                            width: '100%', height: '100%', cursor: 'pointer', padding: 0, border: 'none',
                          }}
                        />
                      </div>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        background: subtitleColor, border: '2px solid rgba(255,255,255,0.25)',
                      }} />
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{subtitleColor}</span>
                    </div>
                  </div>

                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              style={{
                width: '100%', padding: '12px', borderRadius: 10,
                background: 'linear-gradient(135deg, #7C3AED, #C026D3)',
                border: 'none', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
              }}
            >
              Generate Clip
            </button>
          </>
        )}

        {/* State: processing */}
        {state === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '16px 0' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, margin: 0, fontWeight: 500 }}>
              Generating your clip...
            </p>
            <div style={{ width: '100%' }}>
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, height: 6, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #7C3AED, #C026D3)',
                    borderRadius: 8,
                    transition: 'width 0.3s linear',
                  }}
                />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: '6px 0 0', textAlign: 'center' }}>
                {Math.round(progress)}%
              </p>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: 0, textAlign: 'center' }}>
              This usually takes {Math.round((endTime - startTime) / 1000 * 1.5)} seconds
            </p>

          </div>
        )}

        {/* State: done */}
        {state === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
            <p style={{ color: '#4ADE80', fontSize: 18, fontWeight: 700, margin: 0, textAlign: 'center' }}>
              Your clip is ready!
            </p>
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={isDownloading}
              style={{
                width: '100%', padding: '13px', borderRadius: 10,
                background: 'linear-gradient(135deg, #7C3AED, #C026D3)',
                border: 'none', color: '#fff', fontWeight: 700, fontSize: 15,
                cursor: isDownloading ? 'wait' : 'pointer', opacity: isDownloading ? 0.7 : 1,
              }}
            >
              {isDownloading ? 'Downloading...' : 'Download Video'}
            </button>
            <a
              href={`/api/clips/${clipId}/subtitles/srt`}
              style={{
                display: 'block', width: '100%', padding: '13px', borderRadius: 10, boxSizing: 'border-box',
                background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.35)',
                textAlign: 'center', color: '#C084FC', fontWeight: 700, fontSize: 15, textDecoration: 'none',
              }}
            >
              Download SRT
            </a>
            <button
              type="button"
              onClick={handleReset}
              style={{
                background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.3)', fontSize: 12,
                padding: '4px', cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              Re-generate
            </button>
          </div>
        )}

        {/* State: error */}
        {state === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '16px 0' }}>
            <p style={{ color: '#F87171', fontSize: 15, fontWeight: 600, margin: 0 }}>
              Generation failed.
            </p>
            {errorMsg && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0, textAlign: 'center' }}>
                {errorMsg}
              </p>
            )}
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: '10px 24px', borderRadius: 8,
                background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)',
                color: '#C084FC', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        )}
        </div>{/* end scrollable body */}
      </div>
      {showPhone && (
        <PhoneVerifyModal
          onVerified={() => { setShowPhone(false); void handleGenerate() }}
          onClose={() => setShowPhone(false)}
        />
      )}
      {upsellData && (
        <UpsellModal
          plan={upsellData.plan}
          exportsUsed={upsellData.exports_used}
          limit={upsellData.limit}
          onClose={() => setUpsellData(null)}
        />
      )}
    </div>
  )
}
