export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Viral<span className="text-purple-500">Hook</span>
          </h1>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
