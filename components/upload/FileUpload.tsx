// components/upload/FileUpload.tsx
'use client'

import { useState, useRef, useCallback, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { validateFileFormat, validateDuration } from '@/lib/upload-validator'
import type { Plan } from '@/lib/upload-validator'

interface FileUploadProps {
  userPlan?: Plan
  onClose?: () => void
}

type UploadStatus = 'idle' | 'validating' | 'uploading' | 'confirming' | 'done'

async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }
    video.onerror = () => resolve(0)
    video.src = URL.createObjectURL(file)
  })
}

async function uploadWithProgress(
  file: File,
  presignedUrl: string,
  onProgress: (pct: number) => void,
  r2Host?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)))
    xhr.onerror = () => reject(new Error(`Network error uploading to: ${r2Host ?? 'unknown'}`))
    xhr.open('PUT', presignedUrl)
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')
    xhr.send(file)
  })
}

export default function FileUpload({ userPlan = 'free', onClose }: FileUploadProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [projectName, setProjectName] = useState('')

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setStatus('validating')

    const formatCheck = validateFileFormat(file.name)
    if (!formatCheck.valid) {
      setError(formatCheck.error!)
      setStatus('idle')
      return
    }

    const durationSeconds = await getVideoDuration(file)
    const durationCheck = validateDuration(durationSeconds, userPlan)
    if (!durationCheck.valid) {
      setError(durationCheck.error!)
      setStatus('idle')
      return
    }

    setStatus('uploading')
    setProgress(0)

    try {
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || 'video/mp4',
          durationSeconds,
          title: projectName.trim() || file.name.replace(/\.[^/.]+$/, ''),
        }),
      })
      if (!presignRes.ok) {
        const data = await presignRes.json()
        throw new Error(data.error ?? 'Failed to prepare upload')
      }
      const { presignedUrl, projectId } = await presignRes.json()

      const r2Host = new URL(presignedUrl).hostname

      await uploadWithProgress(file, presignedUrl, setProgress, r2Host)

      setStatus('confirming')
      const confirmRes = await fetch('/api/upload/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, fileSize: file.size, durationSeconds }),
      })
      if (!confirmRes.ok) throw new Error('Failed to finalize upload')

      setStatus('done')
      router.push(`/projects/${projectId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setStatus('idle')
      setProgress(null)
    }
  }, [userPlan, router])

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)

  const statusLabel: Record<UploadStatus, string> = {
    idle: '',
    validating: 'Validating file...',
    uploading: `Uploading... ${progress ?? 0}%`,
    confirming: 'Finalizing...',
    done: 'Done!',
  }

  const isActive = status !== 'idle'

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
          Project name <span style={{ color: 'rgba(255,255,255,0.25)' }}>(optional)</span>
        </label>
        <input
          type="text"
          placeholder="My awesome video"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          disabled={status !== 'idle'}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: '8px 12px',
            color: '#E9D5FF',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
            opacity: status !== 'idle' ? 0.5 : 1,
          }}
        />
      </div>

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !isActive && inputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#A855F7' : 'rgba(168,85,247,0.3)'}`,
          borderRadius: 16,
          padding: '40px 24px',
          textAlign: 'center',
          cursor: isActive ? 'default' : 'pointer',
          background: isDragging ? 'rgba(168,85,247,0.06)' : 'rgba(255,255,255,0.01)',
          transition: 'all 0.2s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.mov,video/mp4,video/quicktime"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />

        {!isActive ? (
          <>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎬</div>
            <p style={{ color: '#E9D5FF', fontWeight: 600, marginBottom: 4 }}>
              Drag & drop your video here
            </p>
            <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>
              MP4 or MOV · Max{' '}
              {userPlan === 'free' ? '30 min' :
               userPlan === 'creator' ? '2h' :
               userPlan === 'pro' ? '4h' : '6h'}
            </p>
            <button
              type="button"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #C026D3)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '10px 24px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Browse files
            </button>
          </>
        ) : (
          <div>
            <p style={{ color: '#C084FC', fontWeight: 600, marginBottom: 12 }}>
              {statusLabel[status]}
            </p>
            {progress !== null && (
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #7C3AED, #C026D3)',
                    transition: 'width 0.2s',
                    borderRadius: 8,
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p style={{ color: '#F87171', fontSize: 13, marginTop: 10, textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  )
}
