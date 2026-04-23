import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FanPass — Gamification Stade',
  description: 'Scanne, pronostique, gagne des points et débloque des récompenses exclusives.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full bg-[#0f0f1a] text-white antialiased">
        {children}
      </body>
    </html>
  )
}
