import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCoinAnimation } from '../../hooks/useCoinAnimation'

describe('useCoinAnimation', () => {
  it('isAnimating starts false', () => {
    const { result } = renderHook(() => useCoinAnimation())
    expect(result.current.isAnimating).toBe(false)
  })
  it('queuing an animation sets isAnimating to true', () => {
    const { result } = renderHook(() => useCoinAnimation())
    act(() => { result.current.queueAnimation(100) })
    expect(result.current.isAnimating).toBe(true)
  })
  it('currentDelta reflects queued value', () => {
    const { result } = renderHook(() => useCoinAnimation())
    act(() => { result.current.queueAnimation(250) })
    expect(result.current.currentDelta).toBe(250)
  })
  it('queuing two animations does not show both simultaneously', () => {
    const { result } = renderHook(() => useCoinAnimation())
    act(() => {
      result.current.queueAnimation(100)
      result.current.queueAnimation(200)
    })
    expect(result.current.currentDelta).toBe(100)
  })
})
