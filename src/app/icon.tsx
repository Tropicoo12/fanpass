import { ImageResponse } from 'next/og'

export const sizes = [
  { width: 192, height: 192 },
  { width: 512, height: 512 },
]

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '22%',
        }}
      >
        <div
          style={{
            fontSize: 96,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ⚡
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
