export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-12">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(139,92,246,0.15) 0%, transparent 70%)',
        }}
      />

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Viral<span className="text-purple-500">Hook</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-500">AI Viral Shorts Generator</p>
      </div>

      <div className="w-full max-w-4xl flex rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
        {/* Left panel */}
        <div
          className="hidden md:flex w-2/5 flex-col justify-between p-10"
          style={{
            background:
              'linear-gradient(145deg, #0d0d1a 0%, #12102a 40%, #1a1040 100%)',
          }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
            style={{ background: 'rgba(139,92,246,0.2)' }}>
            🚀
          </div>

          <div>
            <h2 className="text-3xl font-bold text-white leading-tight mb-3">
              Bine ai<br />revenit!
            </h2>
            <p className="text-sm text-zinc-400 mb-10 leading-relaxed">
              Intră în contul tău și continuă<br />să creezi conținut viral.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ background: 'rgba(139,92,246,0.2)' }}>
                  ⚡
                </div>
                <span className="text-sm text-zinc-300">Generează shorts viral cu AI</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ background: 'rgba(59,130,246,0.2)' }}>
                  ⏱
                </div>
                <span className="text-sm text-zinc-300">Economisește timp</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ background: 'rgba(236,72,153,0.2)' }}>
                  👥
                </div>
                <span className="text-sm text-zinc-300">Crește-ți audiența</span>
              </div>
            </div>
          </div>

          <div
            className="w-full h-px"
            style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.4) 0%, transparent 100%)' }}
          />
        </div>

        {/* Right panel */}
        <div className="flex-1 bg-zinc-950 p-8 md:p-12">
          {children}
        </div>
      </div>
    </div>
  )
}
