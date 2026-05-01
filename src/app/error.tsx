'use client'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main style={{
      minHeight: '100vh',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
      padding: '0 24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 72, marginBottom: 16, lineHeight: 1 }}>⚡</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1d1d1f', margin: '0 0 8px' }}>Une erreur est survenue</h1>
      <p style={{ fontSize: 15, color: 'rgba(29,29,31,0.5)', margin: '0 0 32px', maxWidth: 280 }}>
        Quelque chose s&apos;est mal passé. Essaie de recharger la page.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={reset}
          style={{
            padding: '13px 24px',
            borderRadius: 14,
            background: '#1d1d1f',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Réessayer
        </button>
        <a
          href="/home"
          style={{
            padding: '13px 24px',
            borderRadius: 14,
            background: '#f5f5f7',
            color: '#1d1d1f',
            fontSize: 15,
            fontWeight: 700,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Accueil
        </a>
      </div>
    </main>
  )
}
