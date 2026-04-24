import { CoinDisplay, PlayerReputationDisplay } from './CoinDisplay'

const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

interface SocialProofData {
  todayCount: number
  scPreferenceRate: number
  avgSavings: number
  konkordatoAvoided: number
}

function SocialProofWidget() {
  const data: SocialProofData = {
    todayCount: 847 + Math.floor(Date.now() / 600000) % 30,
    scPreferenceRate: 73,
    avgSavings: 2840,
    konkordatoAvoided: 124,
  }
  return (
    <div style={{ background: 'rgba(0,212,170,.04)', border: '1px solid rgba(0,212,170,.15)', borderRadius: 12, padding: '12px 20px', display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
      {[
        { value: data.todayCount, label: 'Bugün denedi' },
        { value: `%${data.scPreferenceRate}`, label: 'SC tercih etti' },
        { value: `${data.avgSavings} JC`, label: 'Ort. tasarruf' },
        { value: data.konkordatoAvoided, label: 'Konkordato önlendi' },
      ].map((d, i) => (
        <div key={i} style={{ textAlign: 'center' }}>
          <div style={{ color: '#00d4aa', fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 16 }}>{d.value}</div>
          <div style={{ color: '#4a5568', fontSize: 11 }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

interface HeaderProps {
  coins: number
  reputation: number
  simDate: { year: number; month: number }
}

export function Header({ coins, reputation, simDate }: HeaderProps) {
  return (
    <header style={{ borderBottom: '1px solid rgba(255,255,255,.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
      <div>
        <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 22, color: '#00d4aa', letterSpacing: 2 }}>
          JUS DIGITALIS
          <span style={{ fontFamily: "'Space Mono',monospace", color: '#4a5568', fontSize: 12, marginLeft: 8, fontWeight: 400 }}>v2.7.3a</span>
        </div>
        <div style={{ color: '#4a5568', fontSize: 11, marginTop: 2 }}>Rnd Lawsuit · TK Opportunity Cost · Sim Analytics</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <SocialProofWidget />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,153,255,.08)', border: '1px solid rgba(0,153,255,.2)', borderRadius: 12, padding: '8px 14px' }}>
          <span style={{ fontSize: 14 }}>📅</span>
          <span style={{ fontFamily: "'Space Mono',monospace", color: '#63b3ed', fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}>
            {TR_MONTHS[simDate.month]} {simDate.year}
          </span>
        </div>
        <PlayerReputationDisplay score={reputation} />
        <CoinDisplay coins={coins} />
      </div>
    </header>
  )
}
