import { useMemo, useEffect } from 'react'

interface ConfettiOverlayProps {
  onDone: () => void
}

export function ConfettiOverlay({ onDone }: ConfettiOverlayProps) {
  const pieces = useMemo(() =>
    Array.from({ length: 52 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.7,
      size: 5 + Math.floor(Math.random() * 9),
      color: ['#00d4aa', '#0099ff', '#f39c12', '#9b59b6', '#ff6b35', '#68d391', '#fbbf24'][i % 7],
      rotate: Math.floor(Math.random() * 360),
      dur: 1.5 + Math.random() * 1.0,
      isCircle: i % 5 === 0,
    })),
  [])

  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 800, overflow: 'hidden' }}>
      {pieces.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            top: -14,
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.isCircle ? '50%' : '2px',
            transform: `rotate(${p.rotate}deg)`,
            animation: `confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
    </div>
  )
}
