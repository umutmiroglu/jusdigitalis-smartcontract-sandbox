import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { BOTS } from '../constants/bots'
import {
  computeSuccessRate, computeDynamicReward,
  computeClassicDirectRate, computeCourtFee,
} from '../utils/math'
import { track } from '../utils/analytics'

type DemoPhase = 'intro' | 'running' | 'result'

interface DemoResult {
  classic: { won: boolean; reward: number; yearsInCourt: number; net: number }
  smart:   { won: boolean; reward: number; net: number }
}

const BOT = BOTS.find(b => b.id === 'opportunist')!
const SC_PARAMS = { timeout: 15, penaltyRate: 20, useOracle: true } as const
const CLASSIC_PARAMS = { timeout: 15, penaltyRate: 20, useOracle: false } as const

function runDemoSimulation(): DemoResult {
  const { reward: classicReward } = computeDynamicReward(BOT, false, null)
  const { reward: scReward }      = computeDynamicReward(BOT, false, null)
  const courtFee = computeCourtFee(BOT.basePrice)

  // Classic path
  const classicDirectRate = computeClassicDirectRate(BOT, false, null)
  const directSuccess = Math.random() < classicDirectRate
  let classicWon: boolean
  let classicYears = 0
  let classicNet: number

  if (directSuccess) {
    classicWon = true
    classicNet = classicReward - BOT.basePrice
  } else {
    classicYears = 3 + Math.floor(Math.random() * 3) // 3–5 years
    const classicSuccessRate = computeSuccessRate(BOT, CLASSIC_PARAMS, false, 0, null)
    classicWon = Math.random() < classicSuccessRate
    // Inflation erodes ~20-40% of recovery over years
    const inflationMult = Math.max(0.3, 1 - classicYears * 0.12)
    const recovered = classicWon ? Math.round(BOT.basePrice * inflationMult * 0.55) : 0
    classicNet = recovered - courtFee
  }

  // Smart path
  const scSuccessRate = computeSuccessRate(BOT, SC_PARAMS, false, 0, null)
  const scWon = Math.random() < scSuccessRate
  const scNet = scWon ? (scReward - BOT.basePrice) : 0 // refund on fail

  return {
    classic: { won: classicWon, reward: classicReward, yearsInCourt: classicYears, net: classicNet },
    smart:   { won: scWon, reward: scReward, net: scNet },
  }
}

export function QuickDemo() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<DemoPhase>('intro')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<DemoResult | null>(null)
  const rafRef = useRef<number | null>(null)
  const startTsRef = useRef<number | null>(null)
  const DURATION = 3000 // 3 seconds

  function startDemo() {
    track('QUICK_DEMO_START', { botId: BOT.id })
    setPhase('running')
    setProgress(0)
    startTsRef.current = null
    const sim = runDemoSimulation()

    const animate = (ts: number) => {
      if (!startTsRef.current) startTsRef.current = ts
      const elapsed = ts - startTsRef.current
      const pct = Math.min((elapsed / DURATION) * 100, 100)
      setProgress(Math.round(pct))
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setResult(sim)
        setPhase('result')
        track('QUICK_DEMO_COMPLETE', {
          classicWon: sim.classic.won,
          scWon: sim.smart.won,
          classicNet: sim.classic.net,
          scNet: sim.smart.net,
        })
      }
    }
    rafRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  const scDelta  = result ? result.smart.net - result.classic.net : 0
  const scBetter = scDelta > 0

  return (
    <div style={{ minHeight: '100vh', background: '#060a10', color: '#e2e8f0' }}>
      <Header />
      <main style={{ padding: '40px 24px', maxWidth: 680, margin: '0 auto' }}>

        {/* ── INTRO ───────────────────────────────────────────── */}
        {phase === 'intro' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>⚡</div>
            <div style={{ color: '#00d4aa', fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: 2, marginBottom: 12 }}>
              30 SANİYELİK KARŞILAŞTIRMA
            </div>
            <h1 style={{ color: '#e2e8f0', fontSize: 28, marginBottom: 12, fontFamily: "'Syne',sans-serif", fontWeight: 800 }}>
              Hızlı Demo
            </h1>
            <p style={{ color: '#718096', fontSize: 14, lineHeight: 1.8, maxWidth: 480, margin: '0 auto 32px' }}>
              Aynı karşı tarafla hem <strong style={{ color: '#ff6b35' }}>Klasik Sözleşme</strong> hem de{' '}
              <strong style={{ color: '#00d4aa' }}>Koşullu İfa Sözleşmesi</strong> simüle edilir.
              Hangisi daha iyi sonuç verir?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '12px 20px', fontSize: 13, color: '#718096' }}>
                <span style={{ fontSize: 20, display: 'block', marginBottom: 6 }}>{BOT.emoji}</span>
                <strong style={{ color: '#e2e8f0' }}>{BOT.name}</strong>
                <div style={{ fontSize: 11, marginTop: 4 }}>{BOT.title}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
                <div style={{ color: '#ff6b35', fontSize: 13 }}>⚖️ Klasik → mahkeme riski</div>
                <div style={{ color: '#00d4aa', fontSize: 13 }}>⚡ Koşullu ifa → doğrulama koruması</div>
              </div>
            </div>
            <button
              onClick={startDemo}
              style={{ padding: '16px 48px', background: 'linear-gradient(135deg,#00d4aa,#0099ff)', border: 'none', borderRadius: 12, color: '#060a10', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, cursor: 'pointer', letterSpacing: 0.5 }}
            >
              Simülasyonu Başlat →
            </button>
          </div>
        )}

        {/* ── RUNNING ─────────────────────────────────────────── */}
        {phase === 'running' && (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 20, animation: 'float 1.5s ease-in-out infinite' }}>⛓️</div>
            <div style={{ color: '#00d4aa', fontFamily: "'Space Mono',monospace", fontSize: 13, marginBottom: 16, letterSpacing: 2 }}>
              SİMÜLASYON ÇALIŞIYOR…
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,.08)', borderRadius: 4, overflow: 'hidden', maxWidth: 400, margin: '0 auto 12px' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#00d4aa,#0099ff)', borderRadius: 4, transition: 'width .04s linear' }} />
            </div>
            <div style={{ color: '#4a5568', fontFamily: "'Space Mono',monospace", fontSize: 12 }}>{progress}%</div>
            <div style={{ marginTop: 24, color: '#718096', fontSize: 13 }}>
              {progress < 33 ? '⚖️ Klasik yöntem işleniyor…'
                : progress < 66 ? '⚡ Koşullu ifa sözleşmesi çalıştırılıyor…'
                : '🔬 Ekonomik analiz yapılıyor…'}
            </div>
          </div>
        )}

        {/* ── RESULT ──────────────────────────────────────────── */}
        {phase === 'result' && result && (
          <div style={{ animation: 'receiptIn .5s ease-out' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🔬</div>
              <h2 style={{ color: '#e2e8f0', fontSize: 24, marginBottom: 4 }}>Simülasyon Tamamlandı</h2>
              <p style={{ color: '#718096', fontSize: 13 }}>{BOT.emoji} {BOT.name} ile yapılan karşılaştırma</p>
            </div>

            {/* Side-by-side columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {/* Classic column */}
              <div style={{
                background: result.classic.won ? 'rgba(243,156,18,.06)' : 'rgba(255,68,68,.08)',
                border: `1px solid ${result.classic.won ? 'rgba(243,156,18,.3)' : 'rgba(255,68,68,.3)'}`,
                borderRadius: 14, padding: 20,
              }}>
                <div style={{ color: '#ff6b35', fontWeight: 700, marginBottom: 16, fontSize: 13 }}>⚖️ Klasik Sözleşme</div>

                {/* Outcome badge */}
                <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, marginBottom: 14, fontSize: 12, fontWeight: 700, background: result.classic.won ? 'rgba(243,156,18,.15)' : 'rgba(255,68,68,.15)', color: result.classic.won ? '#f39c12' : '#ff4444' }}>
                  {result.classic.won ? '✓ Kazandı' : '✗ Kaybetti'}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#718096' }}>
                  {result.classic.yearsInCourt > 0 ? (
                    <>
                      <div>⏱️ Dava süresi: <strong style={{ color: '#f39c12' }}>{result.classic.yearsInCourt} yıl</strong></div>
                      <div>🏛️ Mahkeme yolu</div>
                    </>
                  ) : (
                    <div>✅ Doğrudan teslimat</div>
                  )}
                </div>

                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ color: '#718096', fontSize: 11, marginBottom: 4 }}>NET SONUÇ</div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 20, color: result.classic.net >= 0 ? '#00d4aa' : '#ff4444' }}>
                    {result.classic.net >= 0 ? '+' : ''}{result.classic.net} JC
                  </div>
                </div>
              </div>

              {/* Smart column */}
              <div style={{
                background: result.smart.won ? 'rgba(0,212,170,.08)' : 'rgba(0,153,255,.06)',
                border: `1px solid ${result.smart.won ? 'rgba(0,212,170,.4)' : 'rgba(0,153,255,.3)'}`,
                borderRadius: 14, padding: 20,
              }}>
                <div style={{ color: '#00d4aa', fontWeight: 700, marginBottom: 16, fontSize: 13 }}>⚡ Koşullu İfa</div>

                {/* Outcome badge */}
                <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, marginBottom: 14, fontSize: 12, fontWeight: 700, background: result.smart.won ? 'rgba(0,212,170,.15)' : 'rgba(0,153,255,.15)', color: result.smart.won ? '#00d4aa' : '#63b3ed' }}>
                  {result.smart.won ? '✓ Teslimat OK' : '↩ Otomatik İade'}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#718096' }}>
                  <div>⚡ Anında icra</div>
                  {result.smart.won
                    ? <div>🔒 Doğrulama mekanizmalı</div>
                    : <div style={{ color: '#63b3ed' }}>🔒 Kapital iade edildi</div>}
                </div>

                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ color: '#718096', fontSize: 11, marginBottom: 4 }}>NET SONUÇ</div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 20, color: result.smart.net >= 0 ? '#00d4aa' : '#63b3ed' }}>
                    {result.smart.net >= 0 ? '+' : ''}{result.smart.net} JC
                  </div>
                </div>
              </div>
            </div>

            {/* Delta row */}
            <div style={{
              background: scBetter ? 'rgba(0,212,170,.08)' : 'rgba(113,128,150,.06)',
              border: `1px solid ${scBetter ? 'rgba(0,212,170,.3)' : 'rgba(113,128,150,.2)'}`,
              borderRadius: 12, padding: '14px 20px', marginBottom: 24,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            }}>
              {scBetter ? (
                <>
                  <span style={{ fontSize: 22 }}>⚡</span>
                  <span style={{ color: '#00d4aa', fontWeight: 700, fontSize: 15 }}>
                    Koşullu İfa <strong style={{ fontFamily: "'Space Mono',monospace" }}>{Math.abs(scDelta)} JC</strong> daha iyi
                  </span>
                </>
              ) : scDelta === 0 ? (
                <span style={{ color: '#718096', fontSize: 14 }}>Bu turda eşit sonuç — yeniden dene!</span>
              ) : (
                <>
                  <span style={{ fontSize: 22 }}>⚖️</span>
                  <span style={{ color: '#718096', fontWeight: 700, fontSize: 15 }}>
                    Klasik yöntem <strong style={{ fontFamily: "'Space Mono',monospace", color: '#a0aec0' }}>{Math.abs(scDelta)} JC</strong> daha iyi (bu turda)
                  </span>
                </>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
              <button
                onClick={() => navigate('/')}
                style={{ padding: '14px 0', background: 'linear-gradient(135deg,#00d4aa,#0099ff)', border: 'none', borderRadius: 10, color: '#060a10', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
              >
                Tam Simülasyonu Dene →
              </button>
              <button
                onClick={() => { setPhase('intro'); setResult(null); setProgress(0) }}
                style={{ padding: '12px 0', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, color: '#718096', fontFamily: "'Syne',sans-serif", fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                Yeniden Simüle Et
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
