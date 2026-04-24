import { BANKRUPTCY_THRESHOLD, INITIAL_COINS } from '../../constants/game'

interface BankruptcyModalProps {
  coins: number
  onConcordato: () => void
  onBankruptcy: () => void
}

export function BankruptcyModal({ coins, onConcordato, onBankruptcy }: BankruptcyModalProps) {
  const concordatoLoss = Math.floor(coins * 0.30)
  const remaining = coins - concordatoLoss

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#0d1117', border: '2px solid rgba(255,68,68,.6)', borderRadius: 20, padding: 36, maxWidth: 500, width: '100%', textAlign: 'center', animation: 'insolvencyIn .5s cubic-bezier(.34,1.56,.64,1)', boxShadow: '0 0 60px rgba(255,68,68,.15)' }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🏦</div>
        <div style={{ color: '#ff4444', fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: 3, marginBottom: 8, fontWeight: 700 }}>
          ⚠️ İFLAS TEHDİDİ
        </div>
        <h2 style={{ color: '#e2e8f0', fontSize: 24, marginBottom: 12 }}>Nakit Sıkıntısı</h2>
        <p style={{ color: '#a0aec0', fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
          Bakiyeniz <strong style={{ color: '#ff4444' }}>{coins} JC</strong>'ye düştü — iflas eşiğinin altındasınız.
        </p>
        <p style={{ color: '#718096', fontSize: 13, marginBottom: 28 }}>İki seçeneğiniz var:</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div style={{ background: 'rgba(243,156,18,.06)', border: '1px solid rgba(243,156,18,.3)', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🤝</div>
            <div style={{ color: '#f39c12', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Konkordato</div>
            <p style={{ color: '#a0aec0', fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
              Alacaklılarla anlaşın. <strong style={{ color: '#ff6b35' }}>{concordatoLoss} JC</strong> kaybedin, oyuna devam edin.
            </p>
            <div style={{ background: 'rgba(243,156,18,.08)', borderRadius: 8, padding: '6px 10px', fontSize: 11, color: '#f39c12', marginBottom: 12 }}>
              TİK md. 285 uyarınca<br />Bakiyeniz: {Math.max(remaining, BANKRUPTCY_THRESHOLD + 50)} JC
            </div>
            <button onClick={onConcordato} style={{ width: '100%', padding: '10px 0', background: 'linear-gradient(135deg,#f39c12,#e67e22)', border: 'none', borderRadius: 8, color: '#fff', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Konkordato İlan Et
            </button>
          </div>

          <div style={{ background: 'rgba(255,68,68,.06)', border: '1px solid rgba(255,68,68,.3)', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💀</div>
            <div style={{ color: '#ff4444', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>İflas</div>
            <p style={{ color: '#a0aec0', fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
              Her şeyi sıfırlayın. <strong style={{ color: '#00d4aa' }}>{INITIAL_COINS} JC</strong> ile yeniden başlayın.
            </p>
            <div style={{ background: 'rgba(255,68,68,.08)', borderRadius: 8, padding: '6px 10px', fontSize: 11, color: '#fc8181', marginBottom: 12 }}>
              Tüm itibar ve istatistikler<br />sıfırlanır
            </div>
            <button onClick={onBankruptcy} style={{ width: '100%', padding: '10px 0', background: 'rgba(255,68,68,.15)', border: '1px solid rgba(255,68,68,.4)', borderRadius: 8, color: '#ff4444', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              İflas İlan Et
            </button>
          </div>
        </div>

        <p style={{ color: '#2d3748', fontSize: 11, fontFamily: "'Space Mono',monospace" }}>Bu karar geri alınamaz.</p>
      </div>
    </div>
  )
}
