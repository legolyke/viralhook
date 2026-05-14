'use client'
import { useEffect, useRef, useState } from 'react'

interface ExportModalProps {
  clipId: string
  startTime: number
  endTime: number
  projectFileUrl: string
  onClose: () => void
}

type ModalState = 'crop' | 'processing' | 'done' | 'error'

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

  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Pause video at clip start when in crop state
  useEffect(() => {
    if (state === 'crop' && videoRef.current) {
      videoRef.current.currentTime = startTime / 1000
    }
  }, [state, startTime])

  // Progress bar fill during processing
  useEffect(() => {
    if (state !== 'processing') return
    const durationMs = endTime - startTime
    const estimatedMs = Math.max(5000, durationMs / 1000 * 2 * 1000)
    const intervalMs = 100
    const step = (intervalMs / estimatedMs) * 100
    setProgress(0)
    progressIntervalRef.current = setInterval(() => {
      setProgress(p => Math.min(p + step, 95))
    }, intervalMs)
    return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current) }
  }, [state, startTime, endTime])

  // Poll for clip status during processing
  useEffect(() => {
    if (state !== 'processing') return

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let currentController: AbortController | null = null

    const poll = async () => {
      if (cancelled) return
      currentController = new AbortController()
      try {
        const res = await fetch(`/api/clips/${clipId}/status`, { signal: currentController.signal })
        if (cancelled) return
        if (!res.ok) {
          if (!cancelled) timeoutId = setTimeout(poll, 2000)
          return
        }
        const data = await res.json() as { status: string; file_url: string | null }
        if (cancelled) return
        if (data.status === 'ready') {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
          setProgress(100)
          setFileUrl(data.file_url)
          setState('done')
        } else if (data.status === 'error') {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
          setErrorMsg('Processing failed on the server.')
          setState('error')
        } else {
          if (!cancelled) timeoutId = setTimeout(poll, 2000)
        }
      } catch {
        if (!cancelled) timeoutId = setTimeout(poll, 2000)
      }
    }

    timeoutId = setTimeout(poll, 2000)
    return () => {
      cancelled = true
      currentController?.abort()
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
    try {
      const res = await fetch(`/api/clips/${clipId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crop_x: cropX }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setErrorMsg(data.error ?? 'Failed to start generation.')
        setState('error')
        return
      }
      setState('processing')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error')
      setState('error')
    }
  }

  const handleReset = () => {
    setState('crop')
    setCropX(0.5)
    setErrorMsg('')
    setProgress(0)
    setFileUrl(null)
  }

  // Crop box dimensions in display space
  const aspectRatio = videoNaturalWidth / videoNaturalHeight
  const cropBoxWidthRatio = (9 / 16) / aspectRatio // fraction of container width

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
              {cropBoxWidthRatio >= 0.99
                ? 'Video is already 9:16 — full width will be used'
                : 'Drag to position the crop area for your 9:16 clip'}
            </p>

            {/* Video + overlay container */}
            <div
              ref={containerRef}
              style={{
                position: 'relative',
                width: '100%',
                height: 360,
                borderRadius: 8,
                overflow: 'hidden',
                background: '#000',
                cursor: cropBoxWidthRatio < 0.99 ? 'ew-resize' : 'default',
              }}
            >
              <video
                ref={videoRef}
                src={projectFileUrl}
                muted
                playsInline
                preload="metadata"
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget
                  setVideoNaturalWidth(v.videoWidth || 1920)
                  setVideoNaturalHeight(v.videoHeight || 1080)
                  v.currentTime = startTime / 1000
                }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />

              {/* Dark overlay: left of crop box */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${cropX * (1 - cropBoxWidthRatio) * 100}%`,
                  height: '100%',
                  background: 'rgba(0,0,0,0.55)',
                  pointerEvents: 'none',
                }}
              />

              {/* Crop box (draggable) */}
              <div
                onMouseDown={(e) => {
                  if (cropBoxWidthRatio >= 0.99) return
                  e.preventDefault()
                  setIsDragging(true)
                  setDragStartX(e.clientX)
                  setDragStartCropX(cropX)
                }}
                onTouchStart={(e) => {
                  if (cropBoxWidthRatio >= 0.99 || !e.touches[0]) return
                  setIsDragging(true)
                  setDragStartX(e.touches[0].clientX)
                  setDragStartCropX(cropX)
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `${cropX * (1 - cropBoxWidthRatio) * 100}%`,
                  width: `${cropBoxWidthRatio * 100}%`,
                  height: '100%',
                  border: '2px solid #A855F7',
                  boxSizing: 'border-box',
                  cursor: cropBoxWidthRatio < 0.99 ? 'ew-resize' : 'default',
                }}
              />

              {/* Dark overlay: right of crop box */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: `${(1 - cropX * (1 - cropBoxWidthRatio) - cropBoxWidthRatio) * 100}%`,
                  height: '100%',
                  background: 'rgba(0,0,0,0.55)',
                  pointerEvents: 'none',
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #7C3AED, #C026D3)',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
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
                    transition: 'width 0.2s linear',
                  }}
                />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: '6px 0 0', textAlign: 'center' }}>
                {Math.round(progress)}%
              </p>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: 0, textAlign: 'center' }}>
              This usually takes {Math.round((endTime - startTime) / 1000 * 2)} seconds
            </p>
          </div>
        )}

        {/* State: done */}
        {state === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '16px 0' }}>
            <p style={{ color: '#4ADE80', fontSize: 18, fontWeight: 700, margin: 0 }}>
              Your clip is ready!
            </p>
            <a
              href={fileUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                width: '100%',
                padding: '12px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #7C3AED, #C026D3)',
                textAlign: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                textDecoration: 'none',
              }}
            >
              Download
            </a>
            <button
              type="button"
              onClick={handleReset}
              style={{
                background: 'none',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                color: 'rgba(255,255,255,0.4)',
                fontSize: 13,
                padding: '8px 16px',
                cursor: 'pointer',
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
                padding: '10px 24px',
                borderRadius: 8,
                background: 'rgba(168,85,247,0.1)',
                border: '1px solid rgba(168,85,247,0.3)',
                color: '#C084FC',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
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
