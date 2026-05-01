import Link from 'next/link'

export default function NotFound() {
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
      <div style={{ fontSize: 72, marginBottom: 16, lineHeight: 1 }}>🏟️</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1d1d1f', margin: '0 0 8px' }}>Page introuvable</h1>
      <p style={{ fontSize: 15, color: 'rgba(29,29,31,0.5)', margin: '0 0 32px', maxWidth: 280 }}>
        Cette page n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/home"
        style={{
          padding: '13px 28px',
          borderRadius: 14,
          background: '#1d1d1f',
          color: '#fff',
          fontSize: 15,
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        Retour à l&apos;accueil
      </Link>
    </main>
  )
}
