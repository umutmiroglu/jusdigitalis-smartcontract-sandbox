import type { Bot } from '../../types'
import { pickRandom } from '../../utils/math'

interface LoanModalProps {
  request: { bot: Bot; amount: number; repayRate: number }
  coins: number
  onLend: (amount: number, interest: number) => void
  onRefuse: () => void
}

export function LoanModal({ request, coins, onLend, onRefuse }: LoanModalProps) {
  const { bot, amount } = request
  const canAfford = coins >= amount
  const interest = Math.floor(amount * 0.12)
  const repayChancePct = Math.round(bot.loanRepayRate * 100)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.78)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#0d1b2a', border: `2px solid rgba(${bot.colorRgb},.4)`, borderRadius: 20, padding: 32, maxWidth: 460, width: '100%', animation: 'loanIn .4s ease-out' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 44 }}>{bot.emoji}</span>
          <div>
            <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 17 }}>{bot.name}</div>
            <div style={{ color: '#718096', fontSize: 12 }}>{bot.title}</div>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <p style={{ color: '#e2e8f0', fontSize: 14, lineHeight: 1.7, fontStyle: 'italic' }}>
            "{pickRandom(bot.dialogues.loanRequest)}"
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Talep Edilen', value: `${amount} JC`, color: '#f39c12' },
            { label: 'Geri Ödeme Şansı', value: `%${repayChancePct}`, color: bot.loanRepayRate > 0.6 ? '#00d4aa' : bot.loanRepayRate > 0.4 ? '#f39c12' : '#ff4444' },
            { label: 'Faiz', value: `+${interest} JC`, color: '#0099ff' },
          ].map((d, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ color: d.color, fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 15 }}>{d.value}</div>
              <div style={{ color: '#4a5568', fontSize: 10, marginTop: 2 }}>{d.label}</div>
            </div>
          ))}
        </div>

        {!canAfford && (
          <div style={{ background: 'rgba(255,68,68,.06)', border: '1px solid rgba(255,68,68,.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#fc8181', marginBottom: 14 }}>
            ⚠️ Bakiyeniz yetersiz. Borç vermeye uygun değilsiniz.
          </div>
        )}

        <div style={{ background: 'rgba(255,107,53,.06)', border: '1px solid rgba(255,107,53,.15)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#f6ad55', marginBottom: 20 }}>
          ⚠️ Ödeme yapılmazsa mini dava süreci başlar. Kısmi tahsilat sağlanabilir.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={onRefuse} style={{ padding: '12px 0', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: '#a0aec0', fontFamily: "'Syne',sans-serif", fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            Reddet
          </button>
          <button
            disabled={!canAfford}
            onClick={() => onLend(amount, interest)}
            style={{ padding: '12px 0', border: 'none', borderRadius: 10, fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, cursor: canAfford ? 'pointer' : 'not-allowed', background: canAfford ? `linear-gradient(135deg,rgba(${bot.colorRgb},1),rgba(${bot.colorRgb},.7))` : 'rgba(255,255,255,.05)', color: canAfford ? '#060a10' : '#4a5568' }}
          >
            {canAfford ? `${amount} JC Ver` : 'Yetersiz Bakiye'}
          </button>
        </div>
      </div>
    </div>
  )
}
