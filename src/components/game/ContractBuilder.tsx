import { useState, useEffect, useRef } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { Bot, ContractParams, EventEffect, LegalTerm } from '../../types'
import { ORACLE_FEE, MAX_TRUST_SCORE, TRUST_DISCOUNT_MAX } from '../../constants/game'
import { computeSuccessRate, priceAtSimYear } from '../../utils/math'
import { botEvaluateContract } from '../../utils/trust'
import { track } from '../../utils/analytics'
import { LegalTermTooltip } from '../ui/Tooltip'

interface ContractBuilderProps {
  bot: Bot
  trustScore: number
  dominoBump: number
  crashActive: boolean
  eventEffect: EventEffect | null
  legalTerms: Record<string, LegalTerm>
  simYear: number
  onExecute: (data: { params: ContractParams & { effectivePenaltyRate: number }; evalResult: ReturnType<typeof botEvaluateContract>; totalCost: number; actualPrice: number }) => void
  onBack: () => void
}

export function ContractBuilder({ bot, trustScore, dominoBump, crashActive, eventEffect, legalTerms, simYear, onExecute, onBack }: ContractBuilderProps) {
  const isMobile = useIsMobile()
  const [params, setParams] = useState<ContractParams>({ timeout: 15, penaltyRate: 20, useOracle: false })
  const [effectivePenaltyRate, setEffectivePenaltyRate] = useState(20)
  const [evalResult, setEvalResult] = useState<ReturnType<typeof botEvaluateContract> | null>(null)
  const scTimeRef = useRef(Date.now())

  useEffect(() => {
    const d = Math.floor((trustScore / MAX_TRUST_SCORE) * TRUST_DISCOUNT_MAX)
    setEffectivePenaltyRate(Math.max(0, params.penaltyRate - d))
  }, [params.penaltyRate, trustScore])

  useEffect(() => {
    const ev = botEvaluateContract(bot, { ...params, penaltyRate: effectivePenaltyRate }, trustScore)
    setEvalResult(ev)
  }, [params, effectivePenaltyRate, trustScore, bot])

  const successRate = computeSuccessRate(bot, { ...params, penaltyRate: effectivePenaltyRate }, crashActive, dominoBump, eventEffect)
  const actualPrice = evalResult && !evalResult.refused ? Math.round(bot.basePrice * evalResult.priceMultiplier) : bot.basePrice
  const inflatedPrice = priceAtSimYear(actualPrice, simYear, 0.09)
  const totalCost = inflatedPrice + (params.useOracle ? ORACLE_FEE : 0)

  function handleExecute() {
    track('SC_ARCHITECT', {
      botId: bot.id,
      timeout: params.timeout,
      penaltyRate: params.penaltyRate,
      useOracle: params.useOracle,
      trustDiscountApplied: evalResult?.discount || 0,
      botResponse: evalResult?.refused ? 'refused' : 'accepted',
      reasoningTimeMs: Date.now() - scTimeRef.current,
    })
    onExecute({ params: { ...params, effectivePenaltyRate }, evalResult: evalResult!, totalCost, actualPrice: inflatedPrice })
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>⚡</div>
        <h3 style={{ color: '#e2e8f0', fontSize: 20, marginBottom: 4 }}>Smart Contract Mimarı</h3>
        <p style={{ color: '#718096', fontSize: 13 }}>Sözleşme şartlarını ayarlayın</p>
        {crashActive && <div style={{ background: 'rgba(255,68,68,.1)', border: '1px solid rgba(255,68,68,.3)', color: '#fc8181', borderRadius: 8, padding: '8px 12px', marginTop: 8, fontSize: 12 }}>⚠️ Piyasa krizi aktif</div>}
        {eventEffect?.rewardBonus && <div style={{ background: 'rgba(0,212,170,.08)', border: '1px solid rgba(0,212,170,.2)', color: '#68d391', borderRadius: 8, padding: '8px 12px', marginTop: 8, fontSize: 12 }}>✦ Aktif olay: ödüller +%{Math.round(eventEffect.rewardBonus * 100)}</div>}
      </div>

      {/* Timeout slider */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: '#a0aec0', fontSize: 13 }}>
            <LegalTermTooltip termKey="temerrut" legalTerms={legalTerms}>Teslim Süresi</LegalTermTooltip>
          </span>
          <span style={{ color: '#00d4aa', fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700 }}>{params.timeout} gün</span>
        </div>
        <div style={{ padding: isMobile ? '12px 0' : '4px 0' }}>
          <input type="range" min={5} max={60} value={params.timeout} onChange={e => setParams(p => ({ ...p, timeout: Number(e.target.value) }))} style={{ accentColor: '#00d4aa' }} />
        </div>
      </div>

      {/* Penalty rate slider */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: '#a0aec0', fontSize: 13 }}>
            <LegalTermTooltip termKey="cezaiSart" legalTerms={legalTerms}>Cezai Şart</LegalTermTooltip>
          </span>
          <div style={{ textAlign: 'right' }}>
            {evalResult && evalResult.discount > 0 && (
              <span style={{ color: '#4a5568', fontSize: 11, textDecoration: 'line-through', marginRight: 6 }}>%{params.penaltyRate}</span>
            )}
            <span style={{ color: '#00d4aa', fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700 }}>%{effectivePenaltyRate}</span>
            {evalResult && evalResult.discount > 0 && (
              <span style={{ color: '#00d4aa', fontSize: 10, marginLeft: 4 }}>(-{evalResult.discount})</span>
            )}
          </div>
        </div>
        <div style={{ padding: isMobile ? '12px 0' : '4px 0' }}>
          <input type="range" min={5} max={50} value={params.penaltyRate} onChange={e => setParams(p => ({ ...p, penaltyRate: Number(e.target.value) }))} style={{ width: '100%', accentColor: '#00d4aa' }} />
        </div>
      </div>

      {/* Oracle toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
        <div>
          <div style={{ color: '#a0aec0', fontSize: 13 }}>
            <LegalTermTooltip termKey="oracle" legalTerms={legalTerms}>Oracle Entegrasyonu</LegalTermTooltip>
          </div>
          <div style={{ color: '#4a5568', fontSize: 11, marginTop: 2 }}>+{ORACLE_FEE} JC · Başarı oranını önemli artırır</div>
        </div>
        <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
          <input type="checkbox" checked={params.useOracle} onChange={e => setParams(p => ({ ...p, useOracle: e.target.checked }))} style={{ opacity: 0, width: 0, height: 0 }} />
          <span style={{ position: 'absolute', inset: 0, background: params.useOracle ? '#00d4aa' : 'rgba(255,255,255,.1)', borderRadius: 12, transition: 'background .2s' }} />
          <span style={{ position: 'absolute', top: 3, left: params.useOracle ? 23 : 3, width: 18, height: 18, background: '#fff', borderRadius: '50%', transition: 'left .2s' }} />
        </label>
      </div>

      {/* Bot evaluation feedback */}
      {evalResult && (
        <div style={{
          marginBottom: 20, padding: 14, borderRadius: 10,
          background: evalResult.refused ? 'rgba(255,68,68,.08)' : evalResult.priceMultiplier > 1 ? 'rgba(255,107,53,.08)' : 'rgba(0,212,170,.08)',
          border: `1px solid ${evalResult.refused ? 'rgba(255,68,68,.3)' : evalResult.priceMultiplier > 1 ? 'rgba(255,107,53,.3)' : 'rgba(0,212,170,.2)'}`,
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 20 }}>{bot.emoji}</span>
            <div>
              <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{bot.name}:</div>
              <div style={{ color: evalResult.refused ? '#fc8181' : evalResult.priceMultiplier > 1 ? '#f6ad55' : '#68d391', fontSize: 13 }}>
                {evalResult.reason || '"Şartları kabul ediyorum."'}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 12 }}>
            <div style={{ color: '#718096' }}>Başarı: <strong style={{ color: successRate > 0.6 ? '#00d4aa' : successRate > 0.3 ? '#f39c12' : '#ff4444' }}>%{Math.round(successRate * 100)}</strong></div>
            <div style={{ color: '#718096' }}>Maliyet: <strong style={{ color: '#e2e8f0' }}>{totalCost} JC</strong></div>
            {dominoBump > 0 && <div style={{ color: '#ff6b35', fontSize: 11 }}>Domino: -{Math.round(dominoBump * 100)}%</div>}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button onClick={onBack} style={{ padding: '12px 0', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: '#a0aec0', fontFamily: "'Syne',sans-serif", fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>← Geri</button>
        <button
          onClick={handleExecute}
          disabled={evalResult?.refused}
          style={{ padding: '12px 0', background: evalResult?.refused ? 'rgba(255,255,255,.05)' : 'linear-gradient(135deg,#00d4aa,#0099ff)', border: 'none', borderRadius: 10, color: evalResult?.refused ? '#4a5568' : '#060a10', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, cursor: evalResult?.refused ? 'not-allowed' : 'pointer' }}
        >
          {evalResult?.refused ? 'Bot Reddetti' : 'Sözleşmeyi Kilitle ⚡'}
        </button>
      </div>
    </div>
  )
}
