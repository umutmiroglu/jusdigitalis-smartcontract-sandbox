import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useABVariant } from '../../hooks/useABVariant'

describe('useABVariant', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns a valid ABVariant value', () => {
    const { result } = renderHook(() => useABVariant())
    expect(['forceClassicFirst', 'freeChoice', 'aiAdvisorProminent']).toContain(result.current.variant)
  })

  it('isForceClassic is true when variant is forceClassicFirst', () => {
    localStorage.setItem('jd_ab', 'forceClassicFirst')
    const { result } = renderHook(() => useABVariant())
    expect(result.current.isForceClassic).toBe(true)
    expect(result.current.isFreeChoice).toBe(false)
    expect(result.current.isAIAdvisorProminent).toBe(false)
  })

  it('isFreeChoice is true when variant is freeChoice', () => {
    localStorage.setItem('jd_ab', 'freeChoice')
    const { result } = renderHook(() => useABVariant())
    expect(result.current.isFreeChoice).toBe(true)
    expect(result.current.isForceClassic).toBe(false)
    expect(result.current.isAIAdvisorProminent).toBe(false)
  })

  it('isAIAdvisorProminent is true when variant is aiAdvisorProminent', () => {
    localStorage.setItem('jd_ab', 'aiAdvisorProminent')
    const { result } = renderHook(() => useABVariant())
    expect(result.current.isAIAdvisorProminent).toBe(true)
  })

  it('persists the variant to localStorage', () => {
    const { result } = renderHook(() => useABVariant())
    const storedVariant = localStorage.getItem('jd_ab')
    expect(storedVariant).toBe(result.current.variant)
  })
})
