import { useState, useEffect } from 'react'
import type { AutopsyResult, ContractMethod } from '../../types'
import { computeOpportunityCostHuman } from '../../utils/math'
import { track, logSimulation } from '../../utils/analytics'
import { useCTAState } from '../../hooks/useCTAState'
import { SmartCTA } from '../ui/SmartCTA'

interface RowProps {
  label: string
  value: string
  color?: string
  note?: string
}

function Row({ label, value, color = '#e2e8f0', note }: RowProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
      <span style={{ color: '#718096', fontSize: 13 }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ color, fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{value}</span>
        {note && <div style={{ color: '#4a5568', fontSize: 10 }}>{note}</div>}
      </div>
    </div>
  )
}

interface EconomicAutopsyProps {
  autopsy: AutopsyResult
  method: ContractMethod
  sessionDurationMs: number
  onDone: () => void
  scEverUsed: boolean
  sessionCount: number
}

export function EconomicAutopsy({ autopsy, method, sessionDurationMs, onDone, scEverUsed, sessionCount }: EconomicAutopsyProps) {
  const [viewed, setViewed] = useState(false)
  useEffect(() => { const t = setTimeout(() => setViewed(true), 2000); return () => clearTimeout(t) }, [])
  const humanCost = computeOpportunityCostHuman(autopsy.opportunityCost)
  const scAdvantageRealized = method !== 'smart' && autopsy.scSaving > 0

  const lastOutcome = `${method === 'smart' ? 'sc' : 'classic'}_${autopsy.won ? 'win' : 'loss'}`
  const cta = useCTAState({ lastOutcome, scEverUsed, sessionCount })

  useEffect(() => {
    if (viewed) {
      track('COMPARISON_VIEW', { viewedAfterOutcome: true, timeSpentOnAutopsyMs: sessionDurationMs, scAdvantageRealized })
      logSimulation({ type: 'autopsy_viewed', method, won: autopsy.won, totalClassicLoss: autopsy.totalClassicLoss, scSaving: autopsy.scSaving, scAdvantageRealized, sessionDurationMs })
    }
  }, [viewed])

  return (
    <div style={{ animation: 'receiptIn .5s ease-out' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🔬</div>
        <h3 style={{ color: '#e2e8f0', fontSize: 22, marginBottom: 4 }}>Ekonomik Otopsi</h3>
        <p style={{ color: '#718096', fontSize: 13 }}>Sözleşme gerçekten ne kadara mal oldu?</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ background: method === 'smart' ? 'rgba(0,212,170,.08)' : 'rgba(255,255,255,.03)', border: `1px solid ${method === 'smart' ? 'rgba(0,212,170,.4)' : 'rgba(255,255,255,.08)'}`, borderRadius: 12, padding: 16 }}>
          <div style={{ color: '#00d4aa', fontWeight: 700, marginBottom: 12, fontSize: 13 }}>⚡ Smart Contract</div>
          <Row label="Mahkeme harcı"    value="0 JC"   color="#00d4aa" note="Yok" />
          <Row label="Enflasyon kaybı"  value="0 JC"   color="#00d4aa" note="Anında" />
          <Row label="Fırsat maliyeti"  value="0 JC"   color="#00d4aa" note="0 yıl" />
          <Row label="Konkordato riski" value="%0"     color="#00d4aa" />
        </div>
        <div style={{ background: method !== 'smart' ? 'rgba(255,68,68,.08)' : 'rgba(255,255,255,.03)', border: `1px solid ${method !== 'smart' ? 'rgba(255,68,68,.3)' : 'rgba(255,255,255,.08)'}`, borderRadius: 12, padding: 16 }}>
          <div style={{ color: '#ff6b35', fontWeight: 700, marginBottom: 12, fontSize: 13 }}>⚖️ Klasik Yöntem</div>
          <Row label="Mahkeme harcı" value={`${autopsy.courtFee} JC`} color="#ff6b35" />
          {autopsy.showInflLoss
            ? <Row label="Enflasyon kaybı" value={`${autopsy.inflationLoss} JC`} color="#ff4444" note="Kazandınız — ama geç tahsilat" />
            : <Row label="Enflasyon kaybı" value="— JC" color="#4a5568" note="Tahsilat yok" />
          }
          {autopsy.showOppCost
            ? <Row label="Fırsat maliyeti" value={`${autopsy.opportunityCost} JC`} color="#ff4444" note={`%${autopsy.annualRatePct} yıllık getiri kaçırıldı`} />
            : <Row label="Fırsat maliyeti" value="— JC" color="#4a5568" note="Kaybedilmedi" />
          }
          <Row label="Konkordato riski" value={`%${autopsy.konkordatoRisk}`} color="#f39c12" />
        </div>
      </div>
      {autopsy.showOppCost && autopsy.opportunityCost > 0 && (
        <div style={{ background: 'rgba(255,107,53,.08)', border: '1px solid rgba(255,107,53,.2)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ color: '#ff6b35', fontWeight: 700, marginBottom: 8, fontSize: 13 }}>⏱️ Fırsat Maliyeti Gerçekte Ne Demek?</div>
          <p style={{ color: '#a0aec0', fontSize: 13, lineHeight: 1.7 }}>
            Bu sürede Türkiye piyasasına (%{autopsy.annualRatePct} yıllık ortalama) yatırsaydınız{' '}
            <strong style={{ color: '#ff6b35' }}>{autopsy.opportunityCost} JC</strong> kazanırdınız —{' '}
            yaklaşık <strong style={{ color: '#ff6b35' }}>{humanCost.hours} çalışma saati</strong> ({humanCost.weeks} haftalık emek) değerinde.
          </p>
        </div>
      )}
      {autopsy.showInflLoss && autopsy.inflationLoss > 0 && (
        <div style={{ background: 'rgba(255,68,68,.08)', border: '1px solid rgba(255,68,68,.2)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ color: '#ff4444', fontWeight: 700, marginBottom: 8, fontSize: 13 }}>📉 Enflasyon Kaybı Gerçekte Ne Demek?</div>
          <p style={{ color: '#a0aec0', fontSize: 13, lineHeight: 1.7 }}>
            Davayı kazansanız da tahsilat geç geldi. Paranızın satın alma gücü{' '}
            <strong style={{ color: '#ff4444' }}>{autopsy.inflationLoss} JC</strong> eridi.
          </p>
        </div>
      )}
      {!autopsy.won && autopsy.opportunityCost > 0 && (
        <div style={{ background: 'rgba(255,68,68,.1)', border: '1px solid rgba(255,68,68,.35)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ color: '#ff4444', fontWeight: 700, marginBottom: 10, fontSize: 13 }}>⏳ Kaybettiğinizin Gerçek Bedeli</div>
          <p style={{ color: '#fc8181', fontSize: 14, fontFamily: "'Space Mono',monospace", lineHeight: 1.8, marginBottom: 0 }}>
            <strong>{autopsy.opportunityCost} JC</strong> = yaklaşık{' '}
            <strong>{humanCost.hours} çalışma saati</strong> = <strong>{humanCost.weeks} haftalık emek</strong>
          </p>
          {autopsy.scSaving > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,212,170,.2)', color: '#68d391', fontSize: 13 }}>
              ✓ Smart Contract olsaydı: <strong style={{ color: '#00d4aa' }}>{autopsy.scSaving} JC</strong> kurtarılırdı
            </div>
          )}
        </div>
      )}
      <div style={{ background: scAdvantageRealized ? 'rgba(255,68,68,.06)' : 'rgba(0,212,170,.06)', border: `1px solid ${scAdvantageRealized ? 'rgba(255,68,68,.2)' : 'rgba(0,212,170,.2)'}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <p style={{ color: scAdvantageRealized ? '#fc8181' : '#68d391', fontSize: 13, lineHeight: 1.7 }}>{autopsy.summary}</p>
        {scAdvantageRealized && (
          <div style={{ marginTop: 8, color: '#ff6b35', fontWeight: 700, fontSize: 15 }}>
            Toplam Kaçınılabilir Kayıp: <span style={{ color: '#ff4444' }}>{autopsy.totalClassicLoss} JC</span>
          </div>
        )}
      </div>
      <SmartCTA cta={cta} />
      <button onClick={onDone} style={{ width: '100%', padding: '14px 0', marginTop: 12, background: 'linear-gradient(135deg,#00d4aa,#0099ff)', border: 'none', borderRadius: 10, color: '#060a10', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
        Yeni Simülasyon →
      </button>
    </div>
  )
}
