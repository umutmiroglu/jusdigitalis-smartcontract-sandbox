import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useCTAState } from '../../hooks/useCTAState'

describe('useCTAState', () => {
  it('classic_loss + scEverUsed=false → urgent variant with Smart Contract in label', () => {
    const { result } = renderHook(() => useCTAState({
      lastOutcome: 'classic_loss',
      scEverUsed: false,
      sessionCount: 0,
    }))
    expect(result.current.variant).toBe('urgent')
    expect(result.current.primaryLabel).toContain('Smart Contract')
  })

  it('sc_win → success variant', () => {
    const { result } = renderHook(() => useCTAState({
      lastOutcome: 'sc_win',
      scEverUsed: true,
      sessionCount: 0,
    }))
    expect(result.current.variant).toBe('success')
  })

  it('sessionCount >= 3 → personal variant (no strong outcome)', () => {
    const { result } = renderHook(() => useCTAState({
      lastOutcome: null,
      scEverUsed: false,
      sessionCount: 3,
    }))
    expect(result.current.variant).toBe('personal')
  })

  it('default case → default variant', () => {
    const { result } = renderHook(() => useCTAState({
      lastOutcome: null,
      scEverUsed: true,
      sessionCount: 0,
    }))
    expect(result.current.variant).toBe('default')
  })

  it('urgent takes priority over personal (sessionCount>=3 but classic_loss+!scEverUsed)', () => {
    const { result } = renderHook(() => useCTAState({
      lastOutcome: 'classic_loss',
      scEverUsed: false,
      sessionCount: 5,
    }))
    expect(result.current.variant).toBe('urgent')
  })

  it('success takes priority over personal', () => {
    const { result } = renderHook(() => useCTAState({
      lastOutcome: 'sc_win',
      scEverUsed: true,
      sessionCount: 5,
    }))
    expect(result.current.variant).toBe('success')
  })

  it('each variant has primaryLabel and primaryHref', () => {
    const outcomes: Array<{ lastOutcome: string | null; scEverUsed: boolean; sessionCount: number }> = [
      { lastOutcome: 'classic_loss', scEverUsed: false, sessionCount: 0 },
      { lastOutcome: 'sc_win', scEverUsed: true, sessionCount: 0 },
      { lastOutcome: null, scEverUsed: false, sessionCount: 3 },
      { lastOutcome: null, scEverUsed: true, sessionCount: 0 },
    ]
    outcomes.forEach(input => {
      const { result } = renderHook(() => useCTAState(input))
      expect(result.current.primaryLabel).toBeTruthy()
      expect(result.current.primaryHref).toBeTruthy()
    })
  })
})
