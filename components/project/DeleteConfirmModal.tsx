'use client'

interface DeleteConfirmModalProps {
  isOpen: boolean
  projectTitle: string
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmModal({
  isOpen,
  projectTitle,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '0 16px',
      }}
      onClick={onCancel}
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel() }}
      tabIndex={-1}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        style={{
          background: '#0f0f1a',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 16,
          padding: '28px 24px',
          maxWidth: 400,
          width: '100%',
        }}
      >
        <h3 id="delete-dialog-title" style={{ color: '#fff', fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>
          Delete project?
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }}>
          <strong style={{ color: '#E9D5FF' }}>{projectTitle}</strong> will be permanently deleted
          including the video file. This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 10,
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#F87171',
              fontWeight: 600,
              fontSize: 14,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.5 : 1,
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
