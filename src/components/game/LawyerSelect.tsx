import { useState } from 'react'
import type { Bot, Lawyer, LegalTerm } from '../../types'
import { LAWSUIT_YEARS_BY_BOT, ARBITRATION_YEARS_BY_BOT, INFLATION_BY_YEAR, LAWSUIT_START_YEAR } from '../../constants/game'
import { LAWYERS } from '../../constants/lawyers'
import { computeCourtFee, computeArbitrationFee, priceAtSimYear, pickRandom } from '../../utils/math'
import { LegalTermTooltip } from '../ui/Tooltip'

const COURT_INFLATION_RATE  = 0.09
const LAWYER_INFLATION_RATE = 0.09

interface LawyerSelectProps {
  bot: Bot
  legalTerms: Record<string, LegalTerm>
  simYear?: number
  onSelect: (lawyer: Lawyer, mode: 'lawsuit' | 'arbitration') => void
}

export function LawyerSelect({ bot, legalTerms, simYear = LAWSUIT_START_YEAR, onSelect }: LawyerSelectProps) {
  const [chosen, setChosen] = useState<Lawyer | null>(null)
  const [mode, setMode] = useState<'lawsuit' | 'arbitration'>('lawsuit')
  const isArb = mode === 'arbitration'
  const yearsRange = isArb ? ARBITRATION_YEARS_BY_BOT[bot.id] : LAWSUIT_YEARS_BY_BOT[bot.id]
  const yearsDisplay = `${yearsRange.min}–${yearsRange.max}`
  const baseFee  = isArb ? computeArbitrationFee(bot.basePrice) : computeCourtFee(bot.basePrice)
  const inflFee  = priceAtSimYear(baseFee, simYear, COURT_INFLATION_RATE)
  const inflYears = Math.max(0, simYear - LAWSUIT_START_YEAR)
  const lawyerInflFee = (l: Lawyer) => priceAtSimYear(l.fee, simYear, LAWYER_INFLATION_RATE)

  return (
    <div style={{ animation: 'lawyerPop .4s ease-out' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>⚖️</div>
        <h3 style={{ color: '#e2e8f0', fontSize: 20, marginBottom: 4 }}>Hukuki Temsil Seçin</h3>
        <p style={{ color: '#718096', fontSize: 13 }}>
          Harç: <strong style={{ color: '#ff4444' }}>{inflFee} JC</strong>
          {inflYears > 0 && <span style={{ color: '#f6ad55', fontSize: 11 }}> (📈 {simYear})</span>}
          {' · '}Süreç: <strong style={{ color: '#f39c12' }}>{yearsDisplay} yıl</strong> (rastgele)
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'rgba(255,255,255,.03)', borderRadius: 12, padding: 6 }}>
        {(['lawsuit', 'arbitration'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'Syne',sans-serif", fontWeight: 600, fontSize: 13, background: mode === m ? 'rgba(0,212,170,.15)' : 'transparent', color: mode === m ? '#00d4aa' : '#718096', transition: 'all .2s' }}>
            {m === 'lawsuit' ? 'Mahkeme Davası' : 'Tahkim / Arabulucu'}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
        {LAWYERS.map(l => (
          <div key={l.id} onClick={() => setChosen(l)} style={{ border: `2px solid ${chosen?.id === l.id ? 'rgba(0,212,170,.6)' : 'rgba(255,255,255,.06)'}`, borderRadius: 12, padding: 16, cursor: 'pointer', background: chosen?.id === l.id ? 'rgba(0,212,170,.05)' : 'rgba(255,255,255,.02)', display: 'flex', alignItems: 'center', gap: 16, transition: 'all .2s' }}>
            <span style={{ fontSize: 28 }}>{l.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#e2e8f0', fontWeight: 700 }}>{l.name}</div>
              <div style={{ color: '#718096', fontSize: 11 }}>{l.title}</div>
              <div style={{ color: '#a0aec0', fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>"{pickRandom(l.dialogues)}"</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#ff6b35', fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{lawyerInflFee(l)} JC</div>
              <div style={{ color: '#4a5568', fontSize: 10 }}>Avukat ücreti{inflYears > 0 ? ` (📈${simYear})` : ''}</div>
              <div style={{ color: '#00d4aa', fontSize: 11, marginTop: 4 }}>Kazanma: %{Math.round(l.winMultiplier * 100)}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: 'rgba(255,68,68,.06)', border: '1px solid rgba(255,68,68,.2)', borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 13, color: '#fc8181' }}>
        ⏳ <LegalTermTooltip termKey="temerrut" legalTerms={legalTerms}>Temerrüt</LegalTermTooltip> tarihinden itibaren her yıl değer kaybı.
        {' '}{yearsDisplay} yıl sonra paranın değeri:{' '}
        <strong>%{Math.round((INFLATION_BY_YEAR[yearsRange.min] || 0.5) * 100)}–%{Math.round((INFLATION_BY_YEAR[yearsRange.max] || 0.2) * 100)}</strong>
      </div>
      <button
        disabled={!chosen}
        onClick={() => chosen && onSelect(chosen, mode)}
        style={{ width: '100%', padding: '14px 0', border: 'none', borderRadius: 10, cursor: chosen ? 'pointer' : 'not-allowed', background: chosen ? 'linear-gradient(135deg,#ff6b35,#ff4444)' : 'rgba(255,255,255,.1)', color: chosen ? '#fff' : '#4a5568', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, transition: 'all .2s' }}
      >
        {chosen ? `${chosen.name} ile Davayı Başlat — ${inflFee + lawyerInflFee(chosen)} JC` : 'Avukat Seçin'}
      </button>
    </div>
  )
}
