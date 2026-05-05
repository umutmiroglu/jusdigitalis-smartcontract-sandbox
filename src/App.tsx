import { Component, type ReactNode } from 'react'
import { Routes, Route } from 'react-router-dom'
import { loadPersisted, clearPersisted } from './utils/persistence'
import { track } from './utils/analytics'
import { GamePage } from './pages/GamePage'
import { QuickDemo } from './pages/QuickDemo'
import { ScenarioMode } from './pages/ScenarioMode'
import { ComparisonTool } from './pages/ComparisonTool'

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; canRecover: boolean }
> {
  state = { hasError: false, canRecover: false }

  static getDerivedStateFromError() {
    const saved = loadPersisted()
    return { hasError: true, canRecover: saved !== null }
  }

  componentDidCatch(err: Error) {
    track('SIM_DATA', { type: 'ERROR', message: err.message })
  }

  handleRecover = () => {
    this.setState({ hasError: false, canRecover: false })
  }

  handleReset = () => {
    clearPersisted()
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{
        color: '#e2e8f0', background: '#060a10', minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 16, padding: 40, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <h2 style={{ color: '#ff4444', fontFamily: "'Syne',sans-serif" }}>Sistem Hatası</h2>
        <p style={{ color: '#a0aec0', maxWidth: 320, lineHeight: 1.6 }}>
          Beklenmeyen bir hata oluştu.
        </p>
        {this.state.canRecover && (
          <button
            onClick={this.handleRecover}
            style={{
              background: 'linear-gradient(135deg,#00d4aa,#0099ff)', color: '#060a10',
              border: 'none', padding: '12px 28px', borderRadius: 8,
              cursor: 'pointer', fontWeight: 700, fontFamily: "'Syne',sans-serif", fontSize: 14,
            }}
          >
            Kaldığın Yerden Devam Et
          </button>
        )}
        <button
          onClick={this.handleReset}
          style={{
            background: 'transparent', color: '#718096',
            border: '1px solid rgba(255,255,255,.1)',
            padding: '10px 24px', borderRadius: 8,
            cursor: 'pointer', fontFamily: "'Syne',sans-serif", fontSize: 13,
          }}
        >
          Sıfırla ve Yeniden Başla
        </button>
      </div>
    )
  }
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/demo" element={<QuickDemo />} />
        <Route path="/scenarios" element={<ScenarioMode />} />
        <Route path="/compare" element={<ComparisonTool />} />
      </Routes>
    </ErrorBoundary>
  )
}
