// components/upload/UploadModal.tsx
'use client'

import { useState, useEffect } from 'react'
import FileUpload from './FileUpload'
import UrlImport from './UrlImport'
import { createClient } from '@/lib/supabase/client'
import type { Plan } from '@/lib/upload-validator'

type Tab = 'file' | 'url'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('file')
  const [projectName, setProjectName] = useState('')
  const [userPlan, setUserPlan] = useState<Plan>('free')

  useEffect(() => {
    if (!isOpen) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('subscriptions').select('plan').eq('user_id', user.id).single()
        .then(({ data }) => { if (data?.plan) setUserPlan(data.plan as Plan) })
    })
  }, [isOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) setProjectName('')
  }, [isOpen])

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
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

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
            Project name <span style={{ color: '#F87171' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="My awesome video"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '10px 12px',
              color: '#E9D5FF',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4 }}>
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
          <FileUpload projectName={projectName} onClose={onClose} userPlan={userPlan} />
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
            <p style={{ color: '#fff', fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>
              YouTube & TikTok Import
            </p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
              Coming soon. In the meantime, download your video and upload it directly — it takes just a few seconds.
            </p>
            <button
              onClick={() => setActiveTab('file')}
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #C026D3)',
                border: 'none',
                borderRadius: 10,
                padding: '10px 24px',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Upload File Instead
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
