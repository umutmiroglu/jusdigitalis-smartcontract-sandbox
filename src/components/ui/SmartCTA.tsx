import { track } from '../../utils/analytics'
import type { CTAState, CTAVariant } from '../../hooks/useCTAState'

const VARIANT_COLORS: Record<CTAVariant, { bg: string; border: string; text: string }> = {
  urgent:   { bg: 'rgba(255,68,68,.12)',    border: 'rgba(255,68,68,.4)',    text: '#ff4444' },
  success:  { bg: 'rgba(0,212,170,.12)',    border: 'rgba(0,212,170,.4)',    text: '#00d4aa' },
  personal: { bg: 'rgba(0,153,255,.12)',    border: 'rgba(0,153,255,.4)',    text: '#0099ff' },
  default:  { bg: 'rgba(113,128,150,.10)',  border: 'rgba(113,128,150,.3)', text: '#718096' },
}

interface SmartCTAProps {
  cta: CTAState
}

export function SmartCTA({ cta }: SmartCTAProps) {
  const colors = VARIANT_COLORS[cta.variant]

  function handlePrimaryClick() {
    track('CTA_CLICK', { ctaType: cta.variant, label: cta.primaryLabel, placement: 'autopsy' })
  }

  return (
    <div style={{
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      padding: '16px 20px',
      marginTop: 16,
    }}>
      <div style={{ color: colors.text, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, marginBottom: 12, fontFamily: "'Space Mono',monospace" }}>
        {cta.variant === 'urgent' ? '⚡ AKILLI SÖZLEŞME' : cta.variant === 'success' ? '✦ BAŞARILI SONUÇ' : cta.variant === 'personal' ? '👤 KİŞİSEL ÖNERİ' : '💡 BİLGİ'}
      </div>
      <a
        href={cta.primaryHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handlePrimaryClick}
        style={{
          display: 'block', width: '100%', padding: '12px 0', textAlign: 'center',
          background: colors.text, color: '#060a10',
          border: 'none', borderRadius: 8, cursor: 'pointer',
          fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14,
          textDecoration: 'none', boxSizing: 'border-box',
        }}
      >
        {cta.primaryLabel} →
      </a>
      {cta.secondaryLabel && (
        <button
          onClick={() => track('CTA_CLICK', { ctaType: cta.variant, label: cta.secondaryLabel, placement: 'autopsy_secondary' })}
          style={{
            display: 'block', width: '100%', marginTop: 8, padding: '8px 0',
            background: 'transparent', border: `1px solid ${colors.border}`,
            borderRadius: 8, cursor: 'pointer', color: colors.text,
            fontFamily: "'Syne',sans-serif", fontSize: 13,
          }}
        >
          {cta.secondaryLabel}
        </button>
      )}
    </div>
  )
}
