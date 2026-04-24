import { useState, useEffect } from 'react'
import type { Bot } from '../../types'
import { JUDGE_EMOJI, JUDGE_NAME } from '../../constants/judge'

interface MiniLawsuitProps {
  bot: Bot
  loanAmount: number
  onComplete: (result: { won: boolean; recover: number; courtFee: number }) => void
}

export function MiniLawsuit({ bot, loanAmount, onComplete }: MiniLawsuitProps) {
  const [phase, setPhase] = useState<'opening' | 'verdict'>('opening')
  const [won, setWon] = useState(false)
  const courtFee = Math.round(loanAmount * 0.06)
  const recover  = Math.round(loanAmount * 0.48)

  useEffect(() => {
    const t = setTimeout(() => {
      const result = Math.random() < 0.40
      setWon(result)
      setPhase('verdict')
    }, 2400)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.82)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#0d1b2a', border: '2px solid rgba(255,107,53,.4)', borderRadius: 20, padding: 32, maxWidth: 420, width: '100%', textAlign: 'center' }}>
        {phase === 'opening' && (
          <>
            <div style={{ fontSize: 52, marginBottom: 12 }}>⚖️</div>
            <div style={{ color: '#f39c12', fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>MİNİ DAVA — BORÇ TAHSİLATI</div>
            <h3 style={{ color: '#e2e8f0', fontSize: 20, marginBottom: 12 }}>{bot.name} mahkemede</h3>
            <p style={{ color: '#a0aec0', fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
              {loanAmount} JC'lik alacak için dava açıldı.<br />
              Mahkeme harcı: <strong style={{ color: '#ff6b35' }}>{courtFee} JC</strong>
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', color: '#4a5568', fontSize: 13 }}>
              <div style={{ width: 12, height: 12, border: '2px solid #f39c12', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              Duruşma devam ediyor…
            </div>
          </>
        )}
        {phase === 'verdict' && (
          <div style={{ animation: 'countUp .5s ease-out' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>{won ? '🏆' : '😔'}</div>
            <h3 style={{ color: won ? '#00d4aa' : '#ff4444', fontSize: 22, marginBottom: 8 }}>
              {won ? 'Kısmi Tahsilat' : 'Dava Kaybedildi'}
            </h3>
            <p style={{ color: '#a0aec0', fontSize: 13, lineHeight: 1.7, marginBottom: 8 }}>
              {won
                ? `Mahkeme ${recover} JC tahsilatına hükmetti. Mahkeme harcı: ${courtFee} JC.`
                : `Dava reddedildi. Mahkeme harcı: ${courtFee} JC ekstra kayıp.`
              }
            </p>
            <div style={{ background: won ? 'rgba(0,212,170,.08)' : 'rgba(255,68,68,.08)', border: `1px solid ${won ? 'rgba(0,212,170,.3)' : 'rgba(255,68,68,.2)'}`, borderRadius: 10, padding: 12, marginBottom: 16 }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 18, color: won ? '#00d4aa' : '#ff4444' }}>
                {won ? `+${recover - courtFee} JC net` : `-${courtFee} JC`}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#718096', fontStyle: 'italic' }}>
              {JUDGE_EMOJI} {JUDGE_NAME}: "{won ? 'Alacak kısmen ispat edildi. Tahsilata hükmediyorum.' : 'Delil yetersiz. Dava reddedildi.'}"
            </div>
            <button
              onClick={() => onComplete({ won, recover, courtFee })}
              style={{ width: '100%', padding: '12px 0', background: won ? 'linear-gradient(135deg,#00d4aa,#0099ff)' : 'rgba(255,255,255,.1)', border: 'none', borderRadius: 10, color: won ? '#060a10' : '#e2e8f0', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              Devam Et →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
