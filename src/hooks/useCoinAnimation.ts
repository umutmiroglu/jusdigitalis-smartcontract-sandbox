import { useState, useRef, useCallback } from 'react'

interface CoinAnimationState {
  isAnimating: boolean
  currentDelta: number
  queueAnimation: (delta: number) => void
}

export function useCoinAnimation(): CoinAnimationState {
  const [isAnimating, setIsAnimating]   = useState(false)
  const [currentDelta, setCurrentDelta] = useState(0)
  const queueRef   = useRef<number[]>([])
  const runningRef = useRef(false)

  const processQueue = useCallback(() => {
    if (runningRef.current || queueRef.current.length === 0) return
    runningRef.current = true
    const delta = queueRef.current.shift()!
    setCurrentDelta(delta)
    setIsAnimating(true)
    setTimeout(() => {
      setIsAnimating(false)
      setCurrentDelta(0)
      runningRef.current = false
      processQueue()
    }, 600)
  }, [])

  const queueAnimation = useCallback((delta: number) => {
    queueRef.current.push(delta)
    processQueue()
  }, [processQueue])

  return { isAnimating, currentDelta, queueAnimation }
}
