import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { INFLATION_BY_YEAR } from '../constants/game'
import { track } from '../utils/analytics'
import { Header } from '../components/layout/Header'

export function ComparisonTool() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ contractValue: 50000, counterpartyRisk: 'orta', durationMonths: 12, jurisdiction: 'turkey' })
  const [result, setResult] = useState<Record<string, number> | null>(null)

  function compute() {
    track('CTA_CLICK', { ctaType: 'comparison_tool_compute' })
    const val = form.contractValue
    const intlExtra = form.jurisdiction === 'international' ? 1.8 : 1
    const avgYears = form.jurisdiction === 'international' ? 4.8 : 3.2
    const years = Math.max(avgYears, 1)
    const winRate = ({ dusuk: 0.72, orta: 0.58, yuksek: 0.38 } as Record<string, number>)[form.counterpartyRisk] || 0.58
    const failChance = 1 - winRate
    const classicCourtFee = Math.round(Math.max(val * 0.069, 500))
    const aaütRate = val <= 200000 ? 0.15 : val <= 1000000 ? 0.10 : val <= 5000000 ? 0.07 : 0.05
    const classicLawyerFee = Math.round(val * aaütRate * intlExtra)
    const inflMult = INFLATION_BY_YEAR[Math.min(Math.ceil(years), 10)] || 0.28
    const classicInflLoss = Math.floor(val * (1 - inflMult))
    const annualRate = Math.max(0.40 - (years - 1) * 0.025, 0.22)
    const classicOppCost = Math.floor(val * (Math.pow(1 + annualRate, years) - 1))
    const classicKonkRisk = Math.round(failChance * 0.11 * 100)
    const classicTotalRisk = classicCourtFee + classicLawyerFee + classicInflLoss + classicOppCost
    const scOracleFee = form.jurisdiction === 'international' ? 60 : 30
    const scTotalRisk = Math.round(val * failChance * 0.05) + scOracleFee
    setResult({ val, years, winRate, classicCourtFee, classicLawyerFee, classicInflLoss, classicOppCost, classicKonkRisk, classicTotalRisk, scOracleFee, scTotalRisk, savings: Math.max(classicTotalRisk - scTotalRisk, 0), annualRatePct: Math.round(annualRate * 100) })
  }

  const f = (n: number) => n.toLocaleString('tr-TR')

  return (
    <div style={{ minHeight: '100vh', background: '#060a10', color: '#e2e8f0' }}>
      <Header />
      <main style={{ padding: '32px 24px', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ color: '#9b59b6', fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>KARŞILAŞTIRMA ARACI</div>
            <h2 style={{ color: '#e2e8f0', fontSize: 26, marginBottom: 8 }}>Risk Analizi Hesaplayıcı</h2>
            <p style={{ color: '#718096', fontSize: 14 }}>Sözleşme parametrelerini girin, SC avantajını görün.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div><label style={{ color: '#a0aec0', fontSize: 13, display: 'block', marginBottom: 8 }}>Sözleşme Bedeli (TL)</label><input type="number" value={form.contractValue} onChange={e => setForm(f => ({ ...f, contractValue: Number(e.target.value) }))} style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontFamily: "'Space Mono',monospace", fontSize: 14, outline: 'none', boxSizing: 'border-box' }} /></div>
            <div><label style={{ color: '#a0aec0', fontSize: 13, display: 'block', marginBottom: 8 }}>Süre (Ay)</label><input type="number" value={form.durationMonths} onChange={e => setForm(f => ({ ...f, durationMonths: Number(e.target.value) }))} style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontFamily: "'Space Mono',monospace", fontSize: 14, outline: 'none', boxSizing: 'border-box' }} /></div>
            <div><label style={{ color: '#a0aec0', fontSize: 13, display: 'block', marginBottom: 8 }}>Karşı Taraf Riski</label><select value={form.counterpartyRisk} onChange={e => setForm(f => ({ ...f, counterpartyRisk: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontFamily: "'Syne',sans-serif", fontSize: 14, outline: 'none' }}><option value="dusuk">Düşük</option><option value="orta">Orta</option><option value="yuksek">Yüksek</option></select></div>
            <div><label style={{ color: '#a0aec0', fontSize: 13, display: 'block', marginBottom: 8 }}>Yetki Alanı</label><select value={form.jurisdiction} onChange={e => setForm(f => ({ ...f, jurisdiction: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontFamily: "'Syne',sans-serif", fontSize: 14, outline: 'none' }}><option value="turkey">Türkiye</option><option value="international">Uluslararası</option></select></div>
          </div>
          <button onClick={compute} style={{ width: '100%', padding: '14px 0', background: 'linear-gradient(135deg,#9b59b6,#8e44ad)', border: 'none', borderRadius: 10, color: '#fff', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 24 }}>Risk Analizi Hesapla →</button>
          {result && (
            <div style={{ animation: 'countUp .4s ease-out' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div style={{ background: 'rgba(255,68,68,.08)', border: '1px solid rgba(255,68,68,.3)', borderRadius: 12, padding: 20 }}>
                  <div style={{ color: '#ff4444', fontWeight: 700, marginBottom: 12 }}>⚖️ Klasik Yöntem Riski</div>
                  <div style={{ fontSize: 13, color: '#718096', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>Mahkeme harcı: <strong style={{ color: '#e2e8f0' }}>{f(result.classicCourtFee)} TL</strong></div>
                    <div>Avukat ücreti: <strong style={{ color: '#e2e8f0' }}>{f(result.classicLawyerFee)} TL</strong></div>
                    <div>Enflasyon kaybı: <strong style={{ color: '#ff6b35' }}>{f(result.classicInflLoss)} TL</strong></div>
                    <div>Fırsat maliyeti (%{result.annualRatePct}/yıl): <strong style={{ color: '#ff6b35' }}>{f(result.classicOppCost)} TL</strong></div>
                    <div>Konkordato riski: <strong style={{ color: '#f39c12' }}>%{result.classicKonkRisk}</strong></div>
                  </div>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,68,68,.2)' }}>
                    <div style={{ color: '#718096', fontSize: 11 }}>TOPLAM RİSK</div>
                    <div style={{ color: '#ff4444', fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 20 }}>{f(result.classicTotalRisk)} TL</div>
                  </div>
                </div>
                <div style={{ background: 'rgba(0,212,170,.08)', border: '1px solid rgba(0,212,170,.3)', borderRadius: 12, padding: 20 }}>
                  <div style={{ color: '#00d4aa', fontWeight: 700, marginBottom: 16 }}>⚡ Smart Contract Riski</div>
                  <div style={{ fontSize: 13, color: '#718096', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>Oracle ücreti: <strong style={{ color: '#e2e8f0' }}>{f(result.scOracleFee)} TL</strong></div>
                    <div>Mahkeme harcı: <strong style={{ color: '#00d4aa' }}>0 TL</strong></div>
                    <div>Bekleme süresi: <strong style={{ color: '#00d4aa' }}>0 yıl</strong></div>
                  </div>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,212,170,.2)' }}>
                    <div style={{ color: '#718096', fontSize: 11 }}>TOPLAM RİSK</div>
                    <div style={{ color: '#00d4aa', fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 20 }}>{f(result.scTotalRisk)} TL</div>
                  </div>
                </div>
              </div>
              <div style={{ background: 'rgba(0,212,170,.06)', border: '1px solid rgba(0,212,170,.2)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                <div style={{ color: '#00d4aa', fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Smart Contract ile {f(result.savings)} TL tasarruf potansiyeli</div>
                <div style={{ color: '#718096', fontSize: 13 }}>Bu analiz simülasyon amaçlıdır. Hukuki tavsiye niteliği taşımaz.</div>
              </div>
            </div>
          )}
          <button onClick={() => navigate('/')} style={{ marginTop: 16, padding: '10px 24px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: '#a0aec0', fontFamily: "'Syne',sans-serif", fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>← Simülasyona Dön</button>
        </div>
      </main>
    </div>
  )
}
