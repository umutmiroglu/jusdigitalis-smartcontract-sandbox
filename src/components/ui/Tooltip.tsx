import { useState } from 'react'
import type { LegalTerm } from '../../types'

interface TooltipProps {
  term: LegalTerm
  children?: React.ReactNode
}

export function Tooltip({ term, children }: TooltipProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <span
        className="tooltip-wrap"
        style={{ borderBottom: '1px dashed rgba(0,212,170,.4)', color: '#00d4aa', cursor: 'help' }}
      >
        {children || term.short}
        <span className="tooltip-box">
          <strong style={{ display: 'block', marginBottom: 4 }}>{term.short}</strong>
          {term.definition}
          <br />
          <span style={{ color: 'rgba(0,212,170,.6)', fontSize: 10 }}>{term.ref}</span>
          <br />
          <span
            style={{ color: '#00d4aa', fontSize: 10, cursor: 'pointer', textDecoration: 'underline' }}
            onClick={e => { e.stopPropagation(); setShowModal(true) }}
          >
            Daha fazla bilgi →
          </span>
        </span>
      </span>
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{ background: '#0d1b2a', border: '1px solid rgba(0,212,170,.4)', borderRadius: 16, padding: 32, maxWidth: 480, width: '100%' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontFamily: "'Space Mono',monospace", color: '#00d4aa', fontSize: 12, marginBottom: 8 }}>{term.ref}</div>
            <h3 style={{ color: '#e2e8f0', marginBottom: 16, fontSize: 20 }}>{term.short}</h3>
            <p style={{ color: '#a0aec0', lineHeight: 1.7, fontSize: 14 }}>{term.detail}</p>
            <button
              onClick={() => setShowModal(false)}
              style={{ marginTop: 20, padding: '8px 20px', background: 'rgba(0,212,170,.15)', border: '1px solid rgba(0,212,170,.4)', color: '#00d4aa', borderRadius: 8, cursor: 'pointer', fontFamily: "'Syne',sans-serif", fontSize: 13 }}
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </>
  )
}

interface LegalTermTooltipProps {
  termKey: string
  legalTerms: Record<string, LegalTerm>
  children?: React.ReactNode
}

export function LegalTermTooltip({ termKey, legalTerms, children }: LegalTermTooltipProps) {
  const term = legalTerms[termKey]
  if (!term) return <>{children}</>
  return <Tooltip term={term}>{children}</Tooltip>
}
