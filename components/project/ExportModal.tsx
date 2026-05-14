'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  const [subtitleEnabled, setSubtitleEnabled] = useState(false)
  const [subtitlePosition, setSubtitlePosition] = useState<'bottom' | 'top'>('bottom')
  const [subtitleFontSize, setSubtitleFontSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [subtitleColor, setSubtitleColor] = useState<'white' | 'yellow'>('white')

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
          subtitle_style: subtitleEnabled ? {
            enabled: true,
            position: subtitlePosition,
            font_size: subtitleFontSize,
            color: subtitleColor,
          } : null,
        }),
      })
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
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    padding: 16,
  }

  const modalStyle: React.CSSProperties = {
    background: '#0F0F1A',
    border: '1px solid rgba(168,85,247,0.2)',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 640,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  }

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#E9D5FF', fontWeight: 700, fontSize: 16, margin: 0 }}>Export Clip</h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        </div>

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
                height: 360,
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
            </div>

            {/* Subtitle options */}
            <div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>
                Subtitles
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setSubtitleEnabled(false)}
                  style={{
                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                    background: !subtitleEnabled ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.04)',
                    border: !subtitleEnabled ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.1)',
                    color: !subtitleEnabled ? '#E9D5FF' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  No subtitles
                </button>
                <button
                  type="button"
                  onClick={() => setSubtitleEnabled(true)}
                  style={{
                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                    background: subtitleEnabled ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.04)',
                    border: subtitleEnabled ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.1)',
                    color: subtitleEnabled ? '#E9D5FF' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  Burn into video
                </button>
              </div>

              {subtitleEnabled && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {([
                    { label: 'Position', value: subtitlePosition, set: setSubtitlePosition, opts: [['bottom','Bottom'],['top','Top']] },
                    { label: 'Size', value: subtitleFontSize, set: setSubtitleFontSize, opts: [['small','Small'],['medium','Medium'],['large','Large']] },
                    { label: 'Color', value: subtitleColor, set: setSubtitleColor, opts: [['white','White'],['yellow','Yellow']] },
                  ] as const).map(({ label, value, set, opts }) => (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
                      <select
                        value={value}
                        onChange={e => (set as (v: string) => void)(e.target.value)}
                        style={{
                          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(168,85,247,0.25)',
                          borderRadius: 6, color: '#E9D5FF', fontSize: 12, padding: '5px 8px', cursor: 'pointer',
                        }}
                      >
                        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                  ))}
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
      </div>
    </div>
  )
}
