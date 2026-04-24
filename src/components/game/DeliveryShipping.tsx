import { useState, useEffect, useRef } from 'react'
import type { Bot } from '../../types'
import { pickRandom } from '../../utils/math'

interface DeliveryShippingProps {
  bot: Bot
  deliveryTimeMult?: number
  willSucceed: boolean
  onDelivered: () => void
  onFailed: () => void
}

export function DeliveryShipping({ bot, deliveryTimeMult = 1, willSucceed, onDelivered, onFailed }: DeliveryShippingProps) {
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const totalDuration = 3200 * deliveryTimeMult

  const stages = [
    { pct: 0,  text: 'Sipariş hazırlanıyor…', emoji: '📋' },
    { pct: 25, text: 'Kargo yola çıktı…',    emoji: '🚚' },
    { pct: 55, text: 'Teslim noktasında…',   emoji: '📦' },
    { pct: 80, text: 'Teslim alınıyor…',     emoji: '🖊️' },
  ]
  const stage = [...stages].reverse().find(s => progress >= s.pct) || stages[0]

  useEffect(() => {
    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const prog = Math.min((elapsed / totalDuration) * 100, 100)
      setProgress(Math.round(prog))
      if (prog < 100) { rafRef.current = requestAnimationFrame(animate) }
      else { setDone(true) }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  if (done) {
    if (willSucceed) return (
      <div style={{ textAlign: 'center', animation: 'countUp .5s ease-out' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>📦</div>
        <h3 style={{ color: '#00d4aa', fontSize: 22, marginBottom: 8 }}>Kargo Teslim Edildi</h3>
        <p style={{ color: '#718096', fontSize: 14, marginBottom: 8 }}>{bot.name} malı teslim etti ve imzanızı bekliyor.</p>
        <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: 12, marginBottom: 20, fontSize: 13, color: '#a0aec0', fontStyle: 'italic' }}>
          {bot.emoji} "{pickRandom(bot.dialogues.success)}"
        </div>
        <button onClick={onDelivered} style={{ width: '100%', padding: '14px 0', background: 'linear-gradient(135deg,#00d4aa,#0099ff)', border: 'none', borderRadius: 10, color: '#060a10', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          ✅ Teslim Aldım — Onayla
        </button>
      </div>
    )
    return (
      <div style={{ textAlign: 'center', animation: 'countUp .5s ease-out' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>❌</div>
        <h3 style={{ color: '#ff4444', fontSize: 22, marginBottom: 8 }}>Teslimat Başarısız</h3>
        <p style={{ color: '#718096', fontSize: 14, marginBottom: 8 }}>{bot.name} yükümlülüğünü yerine getirmedi.</p>
        <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: 12, marginBottom: 20, fontSize: 13, color: '#a0aec0', fontStyle: 'italic' }}>
          {bot.emoji} "{pickRandom(bot.dialogues.fail)}"
        </div>
        <button onClick={onFailed} style={{ width: '100%', padding: '14px 0', background: 'linear-gradient(135deg,#ff6b35,#ff4444)', border: 'none', borderRadius: 10, color: '#fff', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          ⚖️ Avukat Tut →
        </button>
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 16, animation: 'float 1.5s ease-in-out infinite' }}>{stage.emoji}</div>
      <h3 style={{ color: '#e2e8f0', fontSize: 20, marginBottom: 4 }}>Teslimat Süreci</h3>
      <p style={{ color: '#718096', fontSize: 13, marginBottom: 20 }}>{bot.emoji} {bot.name} gönderiyor…</p>
      <div style={{ height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,#00d4aa,#0099ff)', borderRadius: 3, transition: 'width .05s linear' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4a5568', marginBottom: 20 }}>
        <span>{stage.text}</span>
        <span style={{ fontFamily: "'Space Mono',monospace", color: '#00d4aa' }}>{progress}%</span>
      </div>
      {deliveryTimeMult > 1 && (
        <div style={{ background: 'rgba(255,107,53,.08)', border: '1px solid rgba(255,107,53,.2)', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: '#f6ad55' }}>
          ⚠️ Tedarik zinciri krizi: süre ×{deliveryTimeMult}
        </div>
      )}
    </div>
  )
}
