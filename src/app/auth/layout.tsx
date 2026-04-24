export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#16213e] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 text-3xl mb-4">
            🏟️
          </div>
          <h1 className="text-2xl font-black">FanPass</h1>
          <p className="text-gray-400 text-sm mt-1">La plateforme fan de ton club</p>
        </div>
        {children}
      </div>
    </div>
  )
}
