import { useState } from 'react'
import { getABVariant } from '../utils/analytics'
import type { ABVariant } from '../types'

export interface ABVariantState {
  variant: ABVariant
  isForceClassic: boolean
  isFreeChoice: boolean
  isAIAdvisorProminent: boolean
}

export function useABVariant(): ABVariantState {
  const [variant] = useState<ABVariant>(() => getABVariant())
  return {
    variant,
    isForceClassic: variant === 'forceClassicFirst',
    isFreeChoice: variant === 'freeChoice',
    isAIAdvisorProminent: variant === 'aiAdvisorProminent',
  }
}
