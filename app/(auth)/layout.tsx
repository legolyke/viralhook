export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: '#09090f' }}>
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(139,92,246,0.12) 0%, transparent 65%)',
        }}
      />

      {/* Logo */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-white tracking-tight">
          Viral<span className="text-purple-500">Hook</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-500">AI Viral Shorts Generator</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-5xl flex rounded-2xl overflow-hidden border border-white/[0.06] shadow-2xl"
        style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.6)' }}>

        {/* Left panel */}
        <div
          className="hidden md:flex w-[380px] shrink-0 flex-col p-12 gap-10"
          style={{
            background: 'linear-gradient(160deg, #1a1135 0%, #130d2e 50%, #0e0b22 100%)',
            borderRight: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {/* Rocket icon */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ background: 'rgba(139,92,246,0.25)' }}
          >
            🚀
          </div>

          {/* Headline + features */}
          <div className="flex flex-col gap-8">
            <div>
              <h2 className="text-3xl font-bold text-white leading-snug">
                Bine ai<br />revenit!
              </h2>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Intră în contul tău și continuă<br />să creezi conținut viral.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
                  style={{ background: 'rgba(139,92,246,0.2)' }}>
                  ⚡
                </div>
                <span className="text-sm text-zinc-300">Generează shorts viral cu AI</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
                  style={{ background: 'rgba(59,130,246,0.2)' }}>
                  ⏱
                </div>
                <span className="text-sm text-zinc-300">Economisește timp</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
                  style={{ background: 'rgba(236,72,153,0.2)' }}>
                  👥
                </div>
                <span className="text-sm text-zinc-300">Crește-ți audiența</span>
              </div>
            </div>
          </div>

          {/* Bottom gradient line */}
          <div className="mt-auto h-px w-full"
            style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.5), transparent)' }} />
        </div>

        {/* Right panel */}
        <div className="flex-1 p-14" style={{ background: '#0d0d16' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
