export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        position: 'relative',
      }}
    >
      {/* Background glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(circle at center, rgba(139,92,246,0.18) 0%, rgba(0,0,0,0) 60%)',
        }}
      />

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 36, position: 'relative', zIndex: 1 }}>
        <h1
          style={{
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: -2,
            margin: 0,
            color: '#ffffff',
            lineHeight: 1,
          }}
        >
          Viral
          <span
            style={{
              background: 'linear-gradient(90deg, #7C3AED, #C026D3)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Hook
          </span>
        </h1>
        <p style={{ fontSize: 20, color: 'rgba(255,255,255,0.6)', margin: '10px 0 0' }}>
          AI Viral Shorts Generator
        </p>
      </div>

      {/* Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 1150,
          minHeight: 730,
          borderRadius: 32,
          background: 'rgba(10,10,18,0.92)',
          border: '1px solid rgba(168,85,247,0.25)',
          backdropFilter: 'blur(20px)',
          boxShadow:
            '0 0 60px rgba(139,92,246,0.15), 0 0 120px rgba(139,92,246,0.08)',
          display: 'flex',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        {/* ── Left panel (42%) ── */}
        <div
          style={{
            width: '42%',
            flexShrink: 0,
            padding: '56px 52px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            borderRight: '1px solid rgba(168,85,247,0.12)',
            background:
              'linear-gradient(150deg, rgba(28,14,60,0.9) 0%, rgba(16,10,38,0.9) 60%, rgba(10,8,26,0.9) 100%)',
          }}
        >
          {/* Welcome text */}
          <div>
            <h2
              style={{
                fontSize: 54,
                fontWeight: 700,
                lineHeight: 1.1,
                color: '#ffffff',
                margin: '0 0 16px',
              }}
            >
              Bine ai{' '}
              <span style={{ color: '#A855F7' }}>revenit!</span>
            </h2>
            <p
              style={{
                fontSize: 16,
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              Intră în contul tău și continuă să creezi conținut viral.
            </p>
          </div>

          {/* Benefits */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { emoji: '⚡', text: 'Generează shorts viral cu AI' },
              { emoji: '📊', text: 'Economisește timp' },
              { emoji: '🚀', text: 'Crește-ți audiența' },
            ].map(({ emoji, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background:
                      'linear-gradient(180deg, rgba(139,92,246,0.25), rgba(139,92,246,0.08))',
                    border: '1px solid rgba(168,85,247,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    flexShrink: 0,
                  }}
                >
                  {emoji}
                </div>
                <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)' }}>{text}</span>
              </div>
            ))}
          </div>

          {/* Purple waves */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 180,
              opacity: 0.35,
              pointerEvents: 'none',
            }}
          >
            <svg
              viewBox="0 0 500 180"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: '100%', height: '100%' }}
            >
              <path d="M-20 160 Q 80 100 180 140 T 380 110 T 520 130" stroke="#A855F7" strokeWidth="1.2" fill="none" />
              <path d="M-20 175 Q 100 115 200 155 T 400 125 T 540 145" stroke="#7C3AED" strokeWidth="0.9" fill="none" />
              <path d="M-20 145 Q 60 90 160 125 T 360 95 T 500 115" stroke="#C026D3" strokeWidth="0.7" fill="none" />
              <path d="M-20 180 Q 120 130 240 165 T 460 135 T 560 155" stroke="#A855F7" strokeWidth="0.6" fill="none" />
            </svg>
          </div>
        </div>

        {/* ── Right panel (58%) ── */}
        <div
          style={{
            flex: 1,
            padding: '48px 56px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
