import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { SCENARIOS } from '../constants/scenarios'
import type { Scenario } from '../constants/scenarios'
import { track } from '../utils/analytics'

type Phase = 'list' | 'context'

export function ScenarioMode() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('list')
  const [selected, setSelected] = useState<Scenario | null>(null)

  function handleSelect(scenario: Scenario) {
    setSelected(scenario)
    setPhase('context')
    track('SCENARIO_SELECT', { scenarioId: scenario.id })
  }

  function handleStart() {
    if (!selected) return
    navigate('/?scenario=' + selected.id)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060a10', color: '#e2e8f0' }}>
      <Header />
      <main style={{ padding: '40px 24px', maxWidth: 680, margin: '0 auto' }}>

        {/* ── LIST ── */}
        {phase === 'list' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🗂️</div>
              <div style={{ color: '#00d4aa', fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: 2, marginBottom: 10 }}>
                GERÇEK DÜNYA SENARYOLARI
              </div>
              <h1 style={{ color: '#e2e8f0', fontSize: 26, marginBottom: 10, fontFamily: "'Syne',sans-serif", fontWeight: 800 }}>
                Senaryo Modu
              </h1>
              <p style={{ color: '#718096', fontSize: 13, lineHeight: 1.8, maxWidth: 480, margin: '0 auto' }}>
                Gerçek ticari uyuşmazlıklara dayalı senaryolarla smart contract'ın hukuki ve ekonomik avantajlarını keşfedin.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {SCENARIOS.map(scenario => (
                <button
                  key={scenario.id}
                  onClick={() => handleSelect(scenario)}
                  style={{
                    background: 'rgba(255,255,255,.02)',
                    border: '1px solid rgba(255,255,255,.08)',
                    borderRadius: 16,
                    padding: '20px 24px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color .2s, background .2s',
                    color: '#e2e8f0',
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,212,170,.4)'
                    ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,212,170,.04)'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,.08)'
                    ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ fontSize: 36, lineHeight: 1, flexShrink: 0 }}>{scenario.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                        {scenario.title}
                      </div>
                      <div style={{ color: '#718096', fontSize: 13, marginBottom: 10 }}>
                        {scenario.subtitle}
                      </div>
                      <div style={{ display: 'inline-block', background: 'rgba(0,153,255,.1)', border: '1px solid rgba(0,153,255,.2)', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#63b3ed', fontFamily: "'Space Mono',monospace" }}>
                        📊 {scenario.stat}
                      </div>
                    </div>
                    <div style={{ color: '#4a5568', fontSize: 18, flexShrink: 0 }}>→</div>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: 28 }}>
              <button
                onClick={() => navigate('/')}
                style={{ padding: '10px 24px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, color: '#718096', fontFamily: "'Syne',sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                ← Simülasyona Dön
              </button>
            </div>
          </>
        )}

        {/* ── CONTEXT ── */}
        {phase === 'context' && selected && (
          <div style={{ animation: 'receiptIn .4s ease-out' }}>
            <button
              onClick={() => setPhase('list')}
              style={{ background: 'none', border: 'none', color: '#718096', cursor: 'pointer', fontSize: 13, marginBottom: 24, padding: 0 }}
            >
              ← Senaryolara Dön
            </button>

            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>{selected.emoji}</div>
              <div style={{ color: '#00d4aa', fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: 2, marginBottom: 10 }}>
                SENARYO
              </div>
              <h2 style={{ color: '#e2e8f0', fontSize: 24, marginBottom: 6, fontFamily: "'Syne',sans-serif", fontWeight: 800 }}>
                {selected.title}
              </h2>
              <p style={{ color: '#a0aec0', fontSize: 14 }}>{selected.subtitle}</p>
            </div>

            {/* Context block */}
            <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
              <div style={{ color: '#4a5568', fontSize: 11, letterSpacing: 1, marginBottom: 10, fontFamily: "'Space Mono',monospace" }}>DURUM</div>
              <p style={{ color: '#a0aec0', fontSize: 14, lineHeight: 1.8, margin: 0 }}>{selected.context}</p>
            </div>

            {/* Learning goal */}
            <div style={{ background: 'rgba(0,212,170,.06)', border: '1px solid rgba(0,212,170,.2)', borderRadius: 14, padding: '16px 22px', marginBottom: 16 }}>
              <div style={{ color: '#00d4aa', fontSize: 11, letterSpacing: 1, marginBottom: 8, fontFamily: "'Space Mono',monospace" }}>ÖĞRENME HEDEFİ</div>
              <p style={{ color: '#68d391', fontSize: 13, lineHeight: 1.7, margin: 0 }}>{selected.learningGoal}</p>
            </div>

            {/* Stat */}
            <div style={{ background: 'rgba(0,153,255,.06)', border: '1px solid rgba(0,153,255,.2)', borderRadius: 12, padding: '12px 20px', marginBottom: 28, fontSize: 12, color: '#63b3ed', fontFamily: "'Space Mono',monospace" }}>
              📊 {selected.stat}
            </div>

            {/* Forced method note */}
            {selected.forcedMethod && (
              <div style={{ background: 'rgba(255,107,53,.06)', border: '1px solid rgba(255,107,53,.2)', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 12, color: '#f6ad55' }}>
                ⚠️ Bu senaryoda önce <strong>{selected.forcedMethod === 'classic' ? 'Klasik Sözleşme' : 'Smart Contract'}</strong> yolunu deneyeceksiniz.
              </div>
            )}

            <button
              onClick={handleStart}
              style={{ width: '100%', padding: '16px 0', background: 'linear-gradient(135deg,#00d4aa,#0099ff)', border: 'none', borderRadius: 12, color: '#060a10', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, cursor: 'pointer', letterSpacing: 0.4 }}
            >
              Simülasyonu Başlat →
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
