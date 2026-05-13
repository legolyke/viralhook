'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DeleteConfirmModal from './DeleteConfirmModal'

interface ProjectHeaderProps {
  id: string
  title: string
  status: string
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  uploading:    { bg: 'rgba(168,85,247,0.1)',  color: '#C084FC' },
  processing:   { bg: 'rgba(234,179,8,0.1)',   color: '#FCD34D' },
  transcribing: { bg: 'rgba(59,130,246,0.1)',  color: '#60A5FA' },
  ready:        { bg: 'rgba(34,197,94,0.1)',   color: '#4ADE80' },
  error:        { bg: 'rgba(239,68,68,0.1)',   color: '#F87171' },
}

export default function ProjectHeader({ id, title, status }: ProjectHeaderProps) {
  const router = useRouter()
  const [currentTitle, setCurrentTitle] = useState(title)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(title)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.processing

  async function saveTitle() {
    if (!editValue.trim() || editValue.trim() === currentTitle) {
      setEditing(false)
      setEditValue(currentTitle)
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editValue.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setCurrentTitle(data.title)
        setEditValue(data.title)
        router.refresh()
      } else {
        setError('Failed to save title. Please try again.')
        setEditValue(currentTitle)
      }
    } catch {
      setError('Failed to save title. Please try again.')
      setEditValue(currentTitle)
    } finally {
      setIsSaving(false)
      setEditing(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/dashboard')
      } else {
        setError('Failed to delete project. Please try again.')
      }
    } catch {
      setError('Failed to delete project. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle()
                  if (e.key === 'Escape') { setEditing(false); setEditValue(currentTitle) }
                }}
                disabled={isSaving}
                style={{
                  flex: 1,
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#fff',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(168,85,247,0.4)',
                  borderRadius: 8,
                  padding: '4px 10px',
                  outline: 'none',
                  minWidth: 0,
                }}
              />
              <button
                type="button"
                onClick={saveTitle}
                disabled={isSaving}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: 'rgba(168,85,247,0.2)',
                  border: '1px solid rgba(168,85,247,0.4)',
                  color: '#C084FC',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                  opacity: isSaving ? 0.5 : 1,
                }}
              >
                {isSaving ? '...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => { setEditing(false); setEditValue(currentTitle) }}
                disabled={isSaving}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.5)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                  opacity: isSaving ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <h1
              onClick={() => setEditing(true)}
              title="Click to rename"
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: '#fff',
                margin: 0,
                cursor: 'text',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentTitle}
            </h1>
          )}
          <span
            style={{
              display: 'inline-block',
              marginTop: 6,
              fontSize: 12,
              padding: '3px 10px',
              borderRadius: 20,
              background: statusStyle.bg,
              color: statusStyle.color,
            }}
          >
            {status}
          </span>
          {error && (
            <p style={{ color: '#F87171', fontSize: 12, margin: '6px 0 0' }}>
              {error}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setEditing(true)}
            style={{
              background: 'rgba(168,85,247,0.08)',
              border: '1px solid rgba(168,85,247,0.2)',
              borderRadius: 8,
              padding: '8px 14px',
              color: '#C084FC',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            ✏️ Edit
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8,
              padding: '8px 14px',
              color: '#F87171',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        projectTitle={currentTitle}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </>
  )
}
