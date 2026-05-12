'use client'

import { useState } from 'react'

export default function UploadZone() {
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false) }}
      style={{
        border: `2px dashed ${dragOver ? 'rgba(168,85,247,0.6)' : 'rgba(168,85,247,0.3)'}`,
        borderRadius: 14,
        background: dragOver ? 'rgba(168,85,247,0.06)' : 'rgba(168,85,247,0.02)',
        padding: '28px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        textAlign: 'center',
        transition: 'border-color 0.15s, background 0.15s',
        cursor: 'default',
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#A855F7" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>Drop your video here</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>or paste a YouTube / TikTok URL</p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          style={{ padding: '8px 18px', borderRadius: 8, background: 'linear-gradient(90deg,#7C3AED,#C026D3)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Browse files
        </button>
        <button
          style={{ padding: '8px 18px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer' }}
        >
          Paste URL
        </button>
      </div>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: 0 }}>MP4, MOV, AVI — max 2GB</p>
    </div>
  )
}
