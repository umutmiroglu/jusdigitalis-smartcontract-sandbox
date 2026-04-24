import { useState, useCallback, useTransition } from 'react'
import type { YearEvent } from '../types'
import { pickRandom } from '../utils/math'

interface TimeTunnelState {
  active: boolean
  currentYear: number
  totalYears: number
  events: YearEvent[]
  currentEvent: string | null
  winProb: number
  isPending: boolean
  start: (events: YearEvent[]) => void
  advanceYear: () => void
  reset: () => void
}

export function useTimeTunnel(): TimeTunnelState {
  const [active, setActive]             = useState(false)
  const [currentYear, setCurrentYear]   = useState(0)
  const [totalYears, setTotalYears]     = useState(0)
  const [events, setEvents]             = useState<YearEvent[]>([])
  const [currentEvent, setCurrentEvent] = useState<string | null>(null)
  const [winProb, setWinProb]           = useState(0.5)
  const [isPending, startTransition]    = useTransition()

  const start = useCallback((yearEvents: YearEvent[]) => {
    setEvents(yearEvents)
    setTotalYears(yearEvents.length)
    setCurrentYear(0)
    setCurrentEvent(null)
    setWinProb(0.5)
    setActive(true)
  }, [])

  const advanceYear = useCallback(() => {
    startTransition(() => {
      setCurrentYear(prev => {
        const next = prev + 1
        const ev = events[next - 1]
        if (ev) {
          setCurrentEvent(pickRandom(ev.events))
          setWinProb(ev.winProb)
        }
        return next
      })
    })
  }, [events, startTransition])

  const reset = useCallback(() => {
    setActive(false)
    setCurrentYear(0)
    setTotalYears(0)
    setEvents([])
    setCurrentEvent(null)
    setWinProb(0.5)
  }, [])

  return { active, currentYear, totalYears, events, currentEvent, winProb, isPending, start, advanceYear, reset }
}
