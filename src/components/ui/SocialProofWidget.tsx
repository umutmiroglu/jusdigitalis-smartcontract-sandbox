import { useSocialProof } from '../../hooks/useSocialProof'

interface StatCardProps {
  emoji: string
  value: string | number
  label: string
}

function StatCard({ emoji, value, label }: StatCardProps) {
  return (
    <div style={{
      flex: '1 1 120px',
      background: 'rgba(0,212,170,.04)',
      border: '1px solid rgba(0,212,170,.15)',
      borderRadius: 10,
      padding: '12px 14px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{emoji}</div>
      <div style={{ color: '#00d4aa', fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 18 }}>{value}</div>
      <div style={{ color: '#4a5568', fontSize: 11, marginTop: 4, lineHeight: 1.4 }}>{label}</div>
    </div>
  )
}

export function SocialProofWidget() {
  const { data, loading } = useSocialProof()

  return (
    <div style={{
      background: 'rgba(0,212,170,.03)',
      border: '1px solid rgba(0,212,170,.2)',
      borderRadius: 14,
      padding: '16px 20px',
      marginBottom: 20,
    }}>
      <div style={{ color: '#718096', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, marginBottom: 12, fontFamily: "'Space Mono',monospace" }}>
        ✦ TOPLULUK İSTATİSTİKLERİ
      </div>
      {loading ? (
        <div style={{ color: '#4a5568', fontSize: 13, textAlign: 'center', padding: '8px 0' }}>Yükleniyor…</div>
      ) : (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <StatCard emoji="🧪" value={data.todayCount} label="Bugün simülasyon" />
          <StatCard emoji="⚡" value={`%${data.scPreferencePercent}`} label="SC tercih etti" />
          <StatCard emoji="💰" value={`${data.avgSavingJC} JC`} label="Ortalama tasarruf" />
          <StatCard emoji="🛡️" value={data.konkordatoAvoided} label="Konkordato önlendi" />
        </div>
      )}
    </div>
  )
}
