interface VideoPlayerProps {
  fileUrl: string
  status: string
}

export default function VideoPlayer({ fileUrl, status }: VideoPlayerProps) {
  if (status === 'uploading' || status === 'processing') {
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(168,85,247,0.1)',
          borderRadius: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            border: '3px solid rgba(168,85,247,0.2)',
            borderTopColor: '#A855F7',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>
          {status === 'uploading' ? 'Uploading video...' : 'Processing video...'}
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          background: 'rgba(239,68,68,0.04)',
          border: '1px solid rgba(239,68,68,0.15)',
          borderRadius: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ color: '#F87171', fontSize: 14, margin: 0 }}>
          Processing failed. Please try uploading again.
        </p>
      </div>
    )
  }

  return (
    <video
      src={fileUrl}
      controls
      muted
      playsInline
      style={{
        width: '100%',
        borderRadius: 16,
        background: '#000',
        maxHeight: 480,
      }}
    />
  )
}
