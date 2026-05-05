import { useNavigate } from 'react-router-dom'
import { Header } from '../components/layout/Header'

export function QuickDemo() {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100vh', background: '#060a10', color: '#e2e8f0' }}>
      <Header />
      <main style={{ padding: '80px 24px', maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <h2 style={{ color: '#e2e8f0', fontSize: 24, marginBottom: 12 }}>Hızlı Demo</h2>
        <p style={{ color: '#718096', fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
          30 saniyede Smart Contract vs Klasik Yöntem karşılaştırması.
        </p>
        <button onClick={() => navigate('/')} style={{ padding: '12px 28px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: '#a0aec0', fontFamily: "'Syne',sans-serif", fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>← Simülasyona Dön</button>
      </main>
    </div>
  )
}
