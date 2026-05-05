import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { SmartCTA } from '../components/ui/SmartCTA'
import { useCTAState } from '../hooks/useCTAState'
import { BOTS } from '../constants/bots'
import { computeSuccessRate, computeClassicDirectRate, computeCourtFee } from '../utils/math'
import { track } from '../utils/analytics'
import type { BotId } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

type CounterpartyRisk = 'low' | 'medium' | 'high'
type Jurisdiction = 'turkey' | 'international'

interface ComparisonInput {
  contractValue: number
  counterpartyRisk: CounterpartyRisk
  durationMonths: number
  jurisdiction: Jurisdiction
}

interface ComparisonResult {
  classic: {
    successRate: number
    expectedYears: number
    worstCaseLoss: number
    courtFee: number
  }
  smart: {
    successRate: number
    oracleFee: number
    protection: number
  }
  recommendation: 'smart' | 'classic' | 'neutral'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RISK_TO_BOT: Record<CounterpartyRisk, BotId> = {
  low: 'honest',
  medium: 'contractor',
  high: 'opportunist',
}

const SC_PARAMS = { timeout: 15, penaltyRate: 20, useOracle: true } as const
const CLASSIC_PARAMS = { timeout: 15, penaltyRate: 20, useOracle: false } as const

// ─── Core computation ─────────────────────────────────────────────────────────

function computeComparison(input: ComparisonInput): ComparisonResult {
  const { contractValue, counterpartyRisk, durationMonths, jurisdiction } = input
  const botId = RISK_TO_BOT[counterpartyRisk]
  const baseBot = BOTS.find(b => b.id === botId)!
  // Use bot's risk profile but with the user's contract value as basePrice
  const bot = { ...baseBot, basePrice: contractValue }

  const jurMult = jurisdiction === 'international' ? 1.4 : 1

  // Classic path
  const directRate = computeClassicDirectRate(bot, false, null)
  const classicCourtRate = computeSuccessRate(bot, CLASSIC_PARAMS, false, 0, null)
  // Combined: direct success OR go to court and win
  const classicSuccessRate = Math.round(
    (directRate + (1 - directRate) * classicCourtRate) * 100,
  )

  // Expected court years when direct delivery fails
  const baseYears = directRate > 0.65
    ? 0
    : Math.round((2 + (1 - classicCourtRate) * 3) * jurMult)
  const durationYears = durationMonths / 12
  const expectedYears = Math.max(baseYears, durationYears > 2 ? Math.round(durationYears * 0.4) : 0)

  const courtFee = computeCourtFee(contractValue)
  // Inflation erodes value proportional to years in court
  const inflMult = Math.max(0.3, 1 - expectedYears * 0.12)
  const worstCaseLoss = expectedYears > 0
    ? Math.round(contractValue * (1 - inflMult * 0.55) + courtFee)
    : courtFee

  // Smart path
  const smartSuccessRate = Math.round(
    computeSuccessRate(bot, SC_PARAMS, false, 0, null) * 100,
  )
  // Oracle fee: 5% of contract value (min 10 JC)
  const oracleFee = Math.max(Math.round(contractValue * 0.05), 10)
  // Worst case: only oracle fee lost (capital always refunded on SC failure)
  const protection = contractValue - oracleFee

  // Recommendation logic
  let recommendation: 'smart' | 'classic' | 'neutral'
  const delta = smartSuccessRate - classicSuccessRate
  if (counterpartyRisk === 'high' || delta >= 15) {
    recommendation = 'smart'
  } else if (directRate > 0.80 && counterpartyRisk === 'low') {
    recommendation = 'classic'
  } else {
    recommendation = delta > 0 ? 'smart' : 'neutral'
  }

  return {
    classic: { successRate: classicSuccessRate, expectedYears, worstCaseLoss, courtFee },
    smart: { successRate: smartSuccessRate, oracleFee, protection },
    recommendation,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const DEFAULT_INPUT: ComparisonInput = {
  contractValue: 500,
  counterpartyRisk: 'medium',
  durationMonths: 6,
  jurisdiction: 'turkey',
}

export function ComparisonTool() {
  const navigate = useNavigate()
  const [input, setInput] = useState<ComparisonInput>(DEFAULT_INPUT)
  const [result, setResult] = useState<ComparisonResult | null>(null)

  const cta = useCTAState({ lastOutcome: null, scEverUsed: false, sessionCount: 0 })

  function handleAnalyze() {
    const r = computeComparison(input)
    setResult(r)
    track('COMPARISON_VIEW', {
      contractValue: input.contractValue,
      counterpartyRisk: input.counterpartyRisk,
      durationMonths: input.durationMonths,
      jurisdiction: input.jurisdiction,
      recommendation: r.recommendation,
    })
  }

  const labelStyle: React.CSSProperties = {
    color: '#a0aec0', fontSize: 12, marginBottom: 6, display: 'block',
    fontFamily: "'Space Mono',monospace", letterSpacing: 0.5,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 14,
    fontFamily: "'Space Mono',monospace", boxSizing: 'border-box',
  }
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

  return (
    <div style={{ minHeight: '100vh', background: '#060a10', color: '#e2e8f0' }}>
      <Header />
      <main style={{ padding: '40px 24px', maxWidth: 680, margin: '0 auto' }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
          <div style={{ color: '#00d4aa', fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: 2, marginBottom: 10 }}>
            RİSK ANALİZİ
          </div>
          <h1 style={{ color: '#e2e8f0', fontSize: 26, marginBottom: 10, fontFamily: "'Syne',sans-serif", fontWeight: 800 }}>
            Karşılaştırma Aracı
          </h1>
          <p style={{ color: '#718096', fontSize: 13, lineHeight: 1.8, maxWidth: 440, margin: '0 auto' }}>
            Sözleşme parametrelerinizi girin; klasik yöntem ile koşullu ifa sözleşmesini yan yana karşılaştırın.
          </p>
        </div>

        {/* Form */}
        <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: '28px 24px', marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Contract Value */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>
                SÖZLEŞME DEĞERİ —{' '}
                <span style={{ color: '#63b3ed' }}>{input.contractValue} JC</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="range"
                  min={50} max={2000} step={50}
                  value={input.contractValue}
                  onChange={e => setInput(p => ({ ...p, contractValue: Number(e.target.value) }))}
                  style={{ flex: 1, accentColor: '#00d4aa' }}
                />
                <input
                  type="number"
                  min={1} max={9999}
                  value={input.contractValue}
                  onChange={e => setInput(p => ({ ...p, contractValue: Math.max(1, Number(e.target.value)) }))}
                  style={{ ...inputStyle, width: 90, textAlign: 'right' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#4a5568', marginTop: 4, fontFamily: "'Space Mono',monospace" }}>
                <span>50</span><span>1000</span><span>2000</span>
              </div>
            </div>

            {/* Counterparty Risk */}
            <div>
              <label style={labelStyle}>KARŞI TARAF RİSKİ</label>
              <select
                value={input.counterpartyRisk}
                onChange={e => setInput(p => ({ ...p, counterpartyRisk: e.target.value as CounterpartyRisk }))}
                style={selectStyle}
              >
                <option value="low">Düşük — Güvenilir</option>
                <option value="medium">Orta — Müteahhit</option>
                <option value="high">Yüksek — Fırsatçı</option>
              </select>
            </div>

            {/* Jurisdiction */}
            <div>
              <label style={labelStyle}>YETKİ ALANI</label>
              <select
                value={input.jurisdiction}
                onChange={e => setInput(p => ({ ...p, jurisdiction: e.target.value as Jurisdiction }))}
                style={selectStyle}
              >
                <option value="turkey">Türkiye</option>
                <option value="international">Uluslararası</option>
              </select>
            </div>

            {/* Duration */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>
                SÖZLEŞME SÜRESİ —{' '}
                <span style={{ color: '#63b3ed' }}>{input.durationMonths} ay</span>
              </label>
              <input
                type="range"
                min={1} max={36} step={1}
                value={input.durationMonths}
                onChange={e => setInput(p => ({ ...p, durationMonths: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: '#0099ff' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#4a5568', marginTop: 4, fontFamily: "'Space Mono',monospace" }}>
                <span>1 ay</span><span>18 ay</span><span>36 ay</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            style={{ width: '100%', marginTop: 24, padding: '14px 0', background: 'linear-gradient(135deg,#00d4aa,#0099ff)', border: 'none', borderRadius: 10, color: '#060a10', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, cursor: 'pointer', letterSpacing: 0.3 }}
          >
            Analiz Et →
          </button>
        </div>

        {/* Results */}
        {result && (
          <div style={{ animation: 'receiptIn .4s ease-out' }}>

            {/* Recommendation banner */}
            <div style={{
              background: result.recommendation === 'smart'
                ? 'rgba(0,212,170,.08)'
                : result.recommendation === 'classic'
                ? 'rgba(243,156,18,.08)'
                : 'rgba(113,128,150,.06)',
              border: `1px solid ${result.recommendation === 'smart' ? 'rgba(0,212,170,.3)' : result.recommendation === 'classic' ? 'rgba(243,156,18,.3)' : 'rgba(113,128,150,.2)'}`,
              borderRadius: 12, padding: '14px 20px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 24 }}>
                {result.recommendation === 'smart' ? '⚡' : '⚖️'}
              </span>
              <div>
                <div style={{
                  fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14,
                  color: result.recommendation === 'smart' ? '#00d4aa' : result.recommendation === 'classic' ? '#f39c12' : '#a0aec0',
                }}>
                  {result.recommendation === 'smart'
                    ? 'Koşullu İfa Öneriliyor'
                    : result.recommendation === 'classic'
                    ? 'Klasik Sözleşme Yeterli'
                    : 'Nötr — Risk Dengelenmiş'}
                </div>
                <div style={{ color: '#718096', fontSize: 12, marginTop: 2 }}>
                  {result.recommendation === 'smart'
                    ? 'Doğrulama mekanizması bu sözleşme profilinde önemli avantaj sağlıyor.'
                    : result.recommendation === 'classic'
                    ? 'Düşük riskli karşı tarafla klasik yöntem yeterli koruma sunar.'
                    : 'Her iki yöntem de benzer risk-getiri profili sunuyor.'}
                </div>
              </div>
            </div>

            {/* Side-by-side metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>

              {/* Classic */}
              <div style={{ background: 'rgba(255,107,53,.05)', border: '1px solid rgba(255,107,53,.2)', borderRadius: 14, padding: 20 }}>
                <div style={{ color: '#ff6b35', fontWeight: 700, fontSize: 11, marginBottom: 16, fontFamily: "'Space Mono',monospace", letterSpacing: 1 }}>
                  ⚖️ KLASİK SÖZLEŞME
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <MetricRow label="Başarı oranı" value={`%${result.classic.successRate}`} color="#f39c12" />
                  <MetricRow
                    label="Beklenen dava"
                    value={result.classic.expectedYears > 0 ? `${result.classic.expectedYears} yıl` : 'Dava yok'}
                    color={result.classic.expectedYears > 0 ? '#fc8181' : '#00d4aa'}
                  />
                  <MetricRow label="Mahkeme harcı" value={`${result.classic.courtFee} JC`} color="#ff6b35" />
                  <MetricRow label="En kötü senaryo" value={`-${result.classic.worstCaseLoss} JC`} color="#ff4444" bold />
                </div>
              </div>

              {/* Smart */}
              <div style={{ background: 'rgba(0,212,170,.05)', border: '1px solid rgba(0,212,170,.2)', borderRadius: 14, padding: 20 }}>
                <div style={{ color: '#00d4aa', fontWeight: 700, fontSize: 11, marginBottom: 16, fontFamily: "'Space Mono',monospace", letterSpacing: 1 }}>
                  ⚡ KOŞULLU İFA
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <MetricRow label="Başarı oranı" value={`%${result.smart.successRate}`} color="#00d4aa" />
                  <MetricRow label="Dava süresi" value="0 — otomatik icra" color="#00d4aa" />
                  <MetricRow label="Doğrulama ücreti" value={`${result.smart.oracleFee} JC`} color="#63b3ed" />
                  <MetricRow label="Sermaye koruması" value={`${result.smart.protection} JC`} color="#00d4aa" bold />
                </div>
              </div>
            </div>

            {/* Delta highlight */}
            {result.recommendation === 'smart' && (
              <div style={{ background: 'rgba(0,212,170,.06)', border: '1px solid rgba(0,212,170,.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#68d391', textAlign: 'center' }}>
                ⚡ Koşullu ifa sözleşmesi, klasik yönteme kıyasla{' '}
                <strong style={{ fontFamily: "'Space Mono',monospace" }}>
                  {result.classic.worstCaseLoss - result.smart.oracleFee} JC
                </strong>{' '}
                daha fazla sermaye koruyor
              </div>
            )}

            {/* CTA */}
            <SmartCTA cta={cta} />

            {/* Simulate */}
            <button
              onClick={() => navigate('/')}
              style={{ width: '100%', marginTop: 14, padding: '13px 0', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, color: '#a0aec0', fontFamily: "'Syne',sans-serif", fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
            >
              Simülasyonda dene →
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function MetricRow({ label, value, color, bold }: {
  label: string; value: string; color: string; bold?: boolean
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
      <span style={{ color: '#718096', fontSize: 11, fontFamily: "'Space Mono',monospace" }}>{label}</span>
      <span style={{ color, fontSize: bold ? 15 : 13, fontWeight: bold ? 700 : 500, fontFamily: "'Space Mono',monospace", textAlign: 'right', flexShrink: 0 }}>
        {value}
      </span>
    </div>
  )
}
