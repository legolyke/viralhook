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
      {/* Page background glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(circle at 50% 0%, rgba(139,92,246,0.14) 0%, transparent 60%)',
        }}
      />

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 36, position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontSize: 72, fontWeight: 800, letterSpacing: -2, margin: 0, color: '#ffffff', lineHeight: 1 }}>
          Viral
          <span style={{
            background: 'linear-gradient(90deg, #7C3AED, #C026D3)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Hook
          </span>
        </h1>
        <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', margin: '10px 0 0' }}>
          AI-Powered Viral Shorts Generator
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
          boxShadow: '0 0 60px rgba(139,92,246,0.15), 0 0 120px rgba(139,92,246,0.08)',
          display: 'flex',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        {/* ══════════ LEFT PANEL ══════════ */}
        <div
          style={{
            width: '42%',
            flexShrink: 0,
            padding: '56px 52px',
            display: 'flex',
            flexDirection: 'column',
            gap: 40,
            position: 'relative',
            overflow: 'hidden',
            borderRight: '1px solid rgba(168,85,247,0.1)',
          }}
        >
          {/* LAYER 1 — Background glow top-left */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at top left, rgba(139,92,246,0.22) 0%, rgba(139,92,246,0.08) 25%, transparent 65%)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          {/* LAYER 2 — Subtle particle dots */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(circle, rgba(168,85,247,0.75) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              opacity: 0.18,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          {/* LAYER 3 — Floating glow particles (animated) */}
          <style>{`
            @keyframes floatUp1 { 0%,100% { transform: translateY(0px); opacity: 0.4; } 50% { transform: translateY(-18px); opacity: 0.8; } }
            @keyframes floatUp2 { 0%,100% { transform: translateY(0px); opacity: 0.3; } 50% { transform: translateY(-12px); opacity: 0.6; } }
            @keyframes floatUp3 { 0%,100% { transform: translateY(0px); opacity: 0.5; } 50% { transform: translateY(-22px); opacity: 0.9; } }
          `}</style>
          {[
            { top: '20%', left: '75%', size: 5, anim: 'floatUp1', dur: '3.2s' },
            { top: '35%', left: '15%', size: 4, anim: 'floatUp2', dur: '4.1s' },
            { top: '55%', left: '85%', size: 3, anim: 'floatUp3', dur: '2.8s' },
            { top: '70%', left: '40%', size: 4, anim: 'floatUp1', dur: '3.7s' },
            { top: '15%', left: '50%', size: 3, anim: 'floatUp2', dur: '5s'   },
            { top: '80%', left: '65%', size: 5, anim: 'floatUp3', dur: '3.5s' },
          ].map((p, i) => (
            <div
              key={i}
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: p.top, left: p.left,
                width: p.size, height: p.size,
                borderRadius: '50%',
                background: 'rgba(168,85,247,0.9)',
                boxShadow: '0 0 8px rgba(168,85,247,0.8)',
                animation: `${p.anim} ${p.dur} ease-in-out infinite`,
                pointerEvents: 'none',
                zIndex: 1,
              }}
            />
          ))}

          {/* LAYER 4 — Wave lines SVG bottom-left */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: 260,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            <svg viewBox="0 0 500 260" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
              <path d="M0 260 C 40 210, 100 240, 160 190 S 280 140, 380 100 S 480 60, 520 20" stroke="#A855F7" strokeWidth="0.9" opacity="0.18" fill="none"/>
              <path d="M0 240 C 50 195, 120 225, 180 175 S 300 125, 400 85 S 490 45, 530 10" stroke="#7C3AED" strokeWidth="0.7" opacity="0.14" fill="none"/>
              <path d="M0 220 C 60 180, 130 210, 200 162 S 320 112, 420 72 S 510 32, 540 0"  stroke="#C026D3" strokeWidth="0.6" opacity="0.10" fill="none"/>
              <path d="M0 260 C 30 200, 90 235, 150 182 S 270 130, 360 90 S 460 50, 510 15"  stroke="#A855F7" strokeWidth="0.5" opacity="0.08" fill="none"/>
              <path d="M0 250 C 70 205, 140 230, 210 185 S 330 140, 430 100 S 510 55, 545 25" stroke="#7C3AED" strokeWidth="0.4" opacity="0.12" fill="none"/>
              <path d="M-10 245 C 45 195, 110 228, 168 178 S 290 128, 390 88 S 480 45, 525 10" stroke="#C026D3" strokeWidth="0.5" opacity="0.09" fill="none"/>
            </svg>
          </div>

          {/* ── Content (above all layers) ── */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 40 }}>

            {/* Rocket icon with glow */}
            <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Exterior glow */}
              <div style={{
                position: 'absolute',
                width: 140, height: 140,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(168,85,247,0.22), transparent 70%)',
                filter: 'blur(20px)',
              }} />
              {/* Circle */}
              <div style={{
                width: 96, height: 96,
                borderRadius: 999,
                background: 'linear-gradient(180deg, rgba(168,85,247,0.35), rgba(124,58,237,0.12))',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 0 40px rgba(168,85,247,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {/* Rocket icon (Heroicons style) */}
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#D8B4FE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                </svg>
              </div>
            </div>

            {/* Heading */}
            <div>
              <h2 style={{ fontSize: 38, fontWeight: 700, lineHeight: 1.15, color: '#ffffff', margin: '0 0 14px' }}>
                Welcome{' '}
                <span style={{ color: '#A855F7' }}>back!</span>
              </h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, margin: 0 }}>
                Sign in to your account and continue<br />creating viral content.
              </p>
            </div>

            {/* Benefits */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {[
                { emoji: '⚡', text: 'Generate viral shorts with AI' },
                { emoji: '📊', text: 'Save time & boost productivity' },
                { emoji: '🚀', text: 'Grow your audience fast' },
              ].map(({ emoji, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                    background: 'linear-gradient(180deg, rgba(139,92,246,0.25), rgba(139,92,246,0.08))',
                    border: '1px solid rgba(168,85,247,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                  }}>
                    {emoji}
                  </div>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════ RIGHT PANEL ══════════ */}
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
