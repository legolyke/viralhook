export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(139,92,246,0.18) 0%, transparent 70%)',
        }}
      />
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Viral<span className="text-purple-500">Hook</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-500">AI Viral Shorts Generator</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-10">
          {children}
        </div>
      </div>
    </div>
  )
}
