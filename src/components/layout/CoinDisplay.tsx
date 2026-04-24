import { memo } from 'react'
import { getReputationBadge } from '../../utils/trust'

interface CoinDisplayProps {
  coins: number
}

export const CoinDisplay = memo(function CoinDisplay({ coins }: CoinDisplayProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,212,170,.1)', border: '1px solid rgba(0,212,170,.3)', borderRadius: 12, padding: '8px 16px' }}>
      <span style={{ fontSize: 18 }}>🪙</span>
      <span style={{ fontFamily: "'Space Mono',monospace", color: '#00d4aa', fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>
        {coins.toLocaleString('tr-TR')}
      </span>
      <span style={{ color: '#4a5568', fontSize: 11 }}>JC</span>
    </div>
  )
})

interface PlayerReputationDisplayProps {
  score: number
}

export const PlayerReputationDisplay = memo(function PlayerReputationDisplay({ score }: PlayerReputationDisplayProps) {
  const badge = getReputationBadge(score)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.04)', border: `1px solid ${badge.color}44`, borderRadius: 12, padding: '8px 14px' }}>
      <span style={{ fontSize: 16 }}>🏅</span>
      <div>
        <div style={{ fontFamily: "'Space Mono',monospace", color: badge.color, fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>{score}/100</div>
        <div style={{ color: '#4a5568', fontSize: 10, lineHeight: 1 }}>{badge.label}</div>
      </div>
    </div>
  )
})
