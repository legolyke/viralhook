interface VideoPlayerProps {
  fileUrl: string
  status: string
}

const SPINNER_STATUSES: Record<string, string> = {
  uploading: 'Uploading video...',
  processing: 'Processing video...',
  transcribing: 'Transcribing audio...',
}

const SPINNER_HINTS: Record<string, string> = {
  uploading: 'Your video is being uploaded securely.',
  processing: 'Preparing your video for AI analysis...',
  transcribing: 'Our AI is transcribing your audio and detecting viral moments. This usually takes 1–3 minutes. The page updates automatically.',
}

export default function VideoPlayer({ fileUrl, status }: VideoPlayerProps) {
  if (status in SPINNER_STATUSES) {
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
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0, fontWeight: 500 }}>
          {SPINNER_STATUSES[status]}
        </p>
        {SPINNER_HINTS[status] && (
          <p style={{
            color: 'rgba(255,255,255,0.25)',
            fontSize: 13,
            margin: 0,
            textAlign: 'center',
            maxWidth: 380,
            lineHeight: 1.6,
          }}>
            {SPINNER_HINTS[status]}
          </p>
        )}
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
      aria-label="Project video"
      style={{
        width: '100%',
        borderRadius: 16,
        background: '#000',
        maxHeight: 480,
      }}
    >
      Your browser does not support video playback.
    </video>
  )
}
