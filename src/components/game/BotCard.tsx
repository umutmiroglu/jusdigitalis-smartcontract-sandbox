import { memo } from 'react'
import type { Bot } from '../../types'
import { getReputationBadge } from '../../utils/trust'
import { LAWSUIT_START_YEAR, MAX_TRUST_SCORE, TRUST_DISCOUNT_MAX } from '../../constants/game'
import { priceAtSimYear } from '../../utils/math'

interface BotCardProps {
  bot: Bot
  trustScore: number
  selected: boolean
  onSelect: (bot: Bot) => void
  disabled?: boolean
  simYear?: number
}

export const BotCard = memo(function BotCard({ bot, trustScore, selected, onSelect, disabled = false, simYear = LAWSUIT_START_YEAR }: BotCardProps) {
  const badge = getReputationBadge(trustScore)
  const discount = Math.floor((trustScore / MAX_TRUST_SCORE) * TRUST_DISCOUNT_MAX)
  const inflYears = Math.max(0, simYear - LAWSUIT_START_YEAR)
  const dispPrice  = inflYears > 0 ? priceAtSimYear(bot.basePrice,  simYear, 0.09) : bot.basePrice
  const dispReward = inflYears > 0 ? priceAtSimYear(bot.baseReward, simYear, 0.09) : bot.baseReward

  return (
    <div
      onClick={() => !disabled && onSelect(bot)}
      style={{
        border: `2px solid ${selected ? `rgba(${bot.colorRgb},.8)` : `rgba(${bot.colorRgb},.2)`}`,
        borderRadius: 16, padding: 24, cursor: disabled ? 'not-allowed' : 'pointer',
        background: selected ? `rgba(${bot.colorRgb},.08)` : 'rgba(255,255,255,.02)',
        transition: 'all .2s', opacity: disabled ? 0.5 : 1,
        transform: selected ? 'scale(1.02)' : 'scale(1)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {selected && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,rgba(${bot.colorRgb},1),transparent)` }} />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 32, animation: 'float 3s ease-in-out infinite' }}>{bot.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 16 }}>{bot.name}</div>
          <div style={{ color: '#718096', fontSize: 11, marginTop: 2 }}>{bot.title}</div>
          <div style={{ marginTop: 5, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 6, padding: '2px 8px' }}>
            <span style={{ color: '#a0aec0', fontSize: 10 }}>{bot.contractType}</span>
            <span style={{ color: '#4a5568', fontSize: 10 }}>·</span>
            <span style={{ color: `rgba(${bot.colorRgb},.7)`, fontSize: 10, fontFamily: "'Space Mono',monospace" }}>{bot.contractRef}</span>
          </div>
          <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ background: `rgba(${bot.colorRgb},.15)`, color: bot.riskColor, fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{bot.risk}</span>
            <span style={{ background: 'rgba(255,255,255,.05)', color: badge.color, fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>Güven {trustScore}/100</span>
            {discount > 0 && <span style={{ background: 'rgba(0,212,170,.1)', color: '#00d4aa', fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>-{discount}% indirim</span>}
          </div>
        </div>
      </div>
      <p style={{ color: '#718096', fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>{bot.description}</p>
      <div style={{ fontFamily: "'Space Mono',monospace", color: `rgba(${bot.colorRgb},.7)`, fontSize: 11, fontStyle: 'italic' }}>"{bot.catchphrase}"</div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#e2e8f0', fontWeight: 700, fontFamily: "'Space Mono',monospace" }}>{dispPrice} JC</div>
          <div style={{ color: '#4a5568', fontSize: 10 }}>Ödeme</div>
          {inflYears > 0 && <div style={{ color: '#f6ad55', fontSize: 9, marginTop: 2 }}>📈 {simYear} fiyatı</div>}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#00d4aa', fontWeight: 700, fontFamily: "'Space Mono',monospace" }}>{dispReward} JC</div>
          <div style={{ color: '#4a5568', fontSize: 10 }}>Beklenen</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: bot.baseSuccessRate > 0.6 ? '#00d4aa' : bot.baseSuccessRate > 0.4 ? '#f39c12' : '#ff4444', fontWeight: 700, fontFamily: "'Space Mono',monospace" }}>%{Math.round(bot.baseSuccessRate * 100)}</div>
          <div style={{ color: '#4a5568', fontSize: 10 }}>Başarı</div>
        </div>
      </div>
    </div>
  )
})
