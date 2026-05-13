// components/upload/UploadModal.tsx
'use client'

import { useState, useEffect } from 'react'
import FileUpload from './FileUpload'
import UrlImport from './UrlImport'

type Tab = 'file' | 'url'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('file')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      />
      <div style={{
        position: 'relative',
        background: '#0b0b14',
        border: '1px solid rgba(168,85,247,0.25)',
        borderRadius: 24,
        padding: '32px',
        width: '100%',
        maxWidth: 520,
        boxShadow: '0 0 60px rgba(168,85,247,0.12)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>
            New Project
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4 }}>
          {(['file', 'url'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 10,
                background: activeTab === tab ? 'rgba(168,85,247,0.15)' : 'transparent',
                border: activeTab === tab ? '1px solid rgba(168,85,247,0.35)' : '1px solid transparent',
                color: activeTab === tab ? '#C084FC' : '#6B7280',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: activeTab === tab ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {tab === 'file' ? '📁 Upload File' : '🔗 Import URL'}
            </button>
          ))}
        </div>

        {activeTab === 'file' ? (
          <FileUpload onClose={onClose} />
        ) : (
          <UrlImport />
        )}
      </div>
    </div>
  )
}
