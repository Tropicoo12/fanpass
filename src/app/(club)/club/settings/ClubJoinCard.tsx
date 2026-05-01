'use client'
import { useState } from 'react'
import QRCode from 'react-qr-code'
import { Copy, Check, QrCode, Link } from 'lucide-react'

interface Props {
  slug: string
  clubName: string
}

export function ClubJoinCard({ slug, clubName }: Props) {
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)

  const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/rejoindre/${slug}`

  function copyLink() {
    navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)', padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <QrCode size={18} color="#059669" />
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1d1d1f' }}>Lien d&apos;invitation fans</p>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(29,29,31,0.45)' }}>Partagez ce lien pour que vos fans rejoignent {clubName}</p>
        </div>
      </div>

      {/* URL display */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.08)', minWidth: 0 }}>
          <Link size={14} color="rgba(29,29,31,0.35)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {joinUrl}
          </span>
        </div>
        <button
          onClick={copyLink}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', borderRadius: 12,
            background: copied ? '#f0fdf4' : '#1d1d1f',
            color: copied ? '#059669' : '#ffffff',
            border: copied ? '1px solid #bbf7d0' : 'none',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copié !' : 'Copier'}
        </button>
      </div>

      {/* QR toggle */}
      <button
        onClick={() => setShowQr(v => !v)}
        style={{
          width: '100%', padding: '10px 0', borderRadius: 12,
          background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.08)',
          color: '#1d1d1f', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        <QrCode size={14} />
        {showQr ? 'Masquer le QR code' : 'Afficher le QR code'}
      </button>

      {showQr && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ padding: 20, background: '#ffffff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)', display: 'inline-block' }}>
            <QRCode value={joinUrl} size={180} />
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(29,29,31,0.45)', textAlign: 'center' }}>
            Imprimez ce QR code ou affichez-le au stade pour que vos fans scannent et rejoignent le club.
          </p>
        </div>
      )}
    </div>
  )
}
