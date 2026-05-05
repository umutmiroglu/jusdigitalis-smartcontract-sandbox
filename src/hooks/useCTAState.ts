export type CTAVariant = 'urgent' | 'success' | 'personal' | 'default'
export type CTAOutcome = 'classic_loss' | 'classic_win' | 'sc_loss' | 'sc_win'

export interface CTAStateInput {
  lastOutcome: string | null
  scEverUsed: boolean
  sessionCount: number
}

export interface CTAState {
  variant: CTAVariant
  primaryLabel: string
  primaryHref: string
  secondaryLabel?: string
}

const CTA_HREF = 'https://jusdigitalis.com'

const CTA_CONFIG: Record<CTAVariant, Omit<CTAState, 'variant'>> = {
  urgent: {
    primaryLabel: 'Koşullu İfa ile Riski Sıfırla',
    primaryHref: CTA_HREF,
    secondaryLabel: 'Önce ücretsiz dene →',
  },
  success: {
    primaryLabel: 'Koşullu Otomatik İfa Sözleşmesi Kur',
    primaryHref: CTA_HREF,
  },
  personal: {
    primaryLabel: 'Portföyünüzü Koruyun',
    primaryHref: CTA_HREF,
  },
  default: {
    primaryLabel: 'Koşullu İfa Hakkında Bilgi Al',
    primaryHref: CTA_HREF,
  },
}

export function useCTAState({ lastOutcome, scEverUsed, sessionCount }: CTAStateInput): CTAState {
  const variant = resolveVariant(lastOutcome, scEverUsed, sessionCount)
  return { variant, ...CTA_CONFIG[variant] }
}

function resolveVariant(
  lastOutcome: string | null,
  scEverUsed: boolean,
  sessionCount: number,
): CTAVariant {
  // Priority 1: urgent — classic loss AND never tried SC
  if (lastOutcome === 'classic_loss' && !scEverUsed) return 'urgent'
  // Priority 2: success — koşullu ifa win
  if (lastOutcome === 'sc_win') return 'success'
  // Priority 3: personal — returning user (3+ sessions)
  if (sessionCount >= 3) return 'personal'
  // Default
  return 'default'
}
