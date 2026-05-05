import { Link, useLocation } from 'react-router-dom'
import { CoinDisplay, PlayerReputationDisplay } from './CoinDisplay'

const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

const NAV_LINKS = [
  { to: '/',          label: 'Simülasyon',  emoji: '🎮' },
  { to: '/demo',      label: 'Hızlı Demo',  emoji: '⚡' },
  { to: '/scenarios', label: 'Senaryolar',  emoji: '🗂️' },
  { to: '/compare',   label: 'Karşılaştır', emoji: '📊' },
]

interface HeaderProps {
  coins?: number
  reputation?: number
  simDate?: { year: number; month: number }
}

export function Header({ coins, reputation, simDate }: HeaderProps) {
  const { pathname } = useLocation()

  return (
    <header style={{ borderBottom: '1px solid rgba(255,255,255,.06)', background: '#060a10' }}>
      {/* Top bar: brand + stats */}
      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 900, fontSize: 22, color: '#00d4aa', letterSpacing: 2 }}>
            JUS DIGITALIS
            <span style={{ fontFamily: "'Space Mono',monospace", color: '#4a5568', fontSize: 12, marginLeft: 8, fontWeight: 400 }}>v2.7.3a</span>
          </div>
          <div style={{ color: '#4a5568', fontSize: 11, marginTop: 2 }}>Rnd Lawsuit · TK Opportunity Cost · Sim Analytics</div>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {simDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,153,255,.08)', border: '1px solid rgba(0,153,255,.2)', borderRadius: 12, padding: '8px 14px' }}>
              <span style={{ fontSize: 14 }}>📅</span>
              <span style={{ fontFamily: "'Space Mono',monospace", color: '#63b3ed', fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}>
                {TR_MONTHS[simDate.month]} {simDate.year}
              </span>
            </div>
          )}
          {reputation !== undefined && <PlayerReputationDisplay score={reputation} />}
          {coins !== undefined && <CoinDisplay coins={coins} />}
        </div>
      </div>
      {/* Nav links */}
      <nav style={{ borderTop: '1px solid rgba(255,255,255,.04)', padding: '0 24px', display: 'flex', gap: 4, overflowX: 'auto' }}>
        {NAV_LINKS.map(({ to, label, emoji }) => {
          const isActive = pathname === to
          return (
            <Link
              key={to}
              to={to}
              style={{
                padding: '12px 18px',
                color: isActive ? '#00d4aa' : '#718096',
                fontFamily: "'Syne',sans-serif",
                fontWeight: 600,
                fontSize: 13,
                borderBottom: `2px solid ${isActive ? '#00d4aa' : 'transparent'}`,
                textDecoration: 'none',
                display: 'flex',
                gap: 6,
                alignItems: 'center',
                whiteSpace: 'nowrap',
                transition: 'color .2s',
              }}
            >
              <span>{emoji}</span>{label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
