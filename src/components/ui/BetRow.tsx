'use client'

interface BetOption {
  id: string
  label: string
}

interface BetRowProps {
  label: string
  options: BetOption[]
  selectedOption: string | null
  cote: number
  onSelect: (id: string) => void
  primaryColor: string
}

export function BetRow({ label, options, selectedOption, cote, onSelect, primaryColor }: BetRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <span
        style={{
          flex: 1,
          fontSize: 13,
          color: '#1d1d1f',
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', gap: 6 }}>
        {options.map((opt) => {
          const selected = selectedOption === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                background: selected ? primaryColor : '#ebebed',
                color: selected ? '#ffffff' : 'rgba(29,29,31,0.70)',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#c8860a',
          minWidth: 36,
          textAlign: 'right',
        }}
      >
        x{cote}
      </span>
    </div>
  )
}
