export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: '#08080f' }}
    >
      {/* Purple glow top */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% -5%, rgba(120,60,230,0.2) 0%, transparent 70%)',
        }}
      />

      {/* Logo */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight" style={{ color: '#ffffff' }}>
          Viral<span style={{ color: '#a855f7' }}>Hook</span>
        </h1>
        <p className="mt-2 text-sm" style={{ color: '#6b7280' }}>
          AI Viral Shorts Generator
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full flex rounded-2xl overflow-hidden"
        style={{
          maxWidth: '960px',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 30px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.05)',
        }}
      >
        {/* ── Left panel ── */}
        <div
          className="hidden md:flex flex-col justify-between"
          style={{
            width: '340px',
            flexShrink: 0,
            padding: '44px 40px',
            background: 'linear-gradient(150deg, #16103a 0%, #110d30 55%, #0c0a22 100%)',
            borderRight: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {/* Rocket */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(139,92,246,0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            🚀
          </div>

          {/* Text + features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div>
              <h2
                className="font-bold leading-snug"
                style={{ fontSize: 28, color: '#ffffff', marginBottom: 12 }}
              >
                Bine ai<br />revenit!
              </h2>
              <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.65 }}>
                Intră în contul tău și continuă<br />să creezi conținut viral.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { icon: '⚡', bg: 'rgba(139,92,246,0.2)', text: 'Generează shorts viral cu AI' },
                { icon: '⏱', bg: 'rgba(59,130,246,0.2)', text: 'Economisește timp' },
                { icon: '👥', bg: 'rgba(236,72,153,0.2)', text: 'Crește-ți audiența' },
              ].map(({ icon, bg, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {icon}
                  </div>
                  <span style={{ fontSize: 13, color: '#d1d5db' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom line */}
          <div
            style={{
              height: 1,
              background: 'linear-gradient(90deg, rgba(139,92,246,0.5), transparent)',
            }}
          />
        </div>

        {/* ── Right panel ── */}
        <div
          className="flex-1"
          style={{
            padding: '52px 56px',
            background: '#0b0b14',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
