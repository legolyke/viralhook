'use client'

import { useState } from 'react'
import UploadModal from '@/components/upload/UploadModal'

export default function DashboardUploadTrigger() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div
        onClick={() => setIsOpen(true)}
        style={{
          border: '2px dashed rgba(168,85,247,0.3)',
          borderRadius: 16,
          padding: '36px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: 'rgba(255,255,255,0.01)',
          transition: 'border-color 0.2s, background 0.2s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(168,85,247,0.6)'
          ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(168,85,247,0.04)'
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(168,85,247,0.3)'
          ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.01)'
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 10 }}>🎬</div>
        <p style={{ color: '#E9D5FF', fontWeight: 600, margin: '0 0 4px' }}>
          Upload or import a video
        </p>
        <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>
          MP4 or MOV · Or paste a YouTube / TikTok link
        </p>
      </div>

      <UploadModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
