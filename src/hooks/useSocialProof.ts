import { useState, useEffect } from 'react'

export interface SocialProofData {
  todayCount: number
  scPreferencePercent: number
  avgSavingJC: number
  konkordatoAvoided: number
}

const FALLBACK: SocialProofData = {
  todayCount: 47,
  scPreferencePercent: 68,
  avgSavingJC: 145,
  konkordatoAvoided: 12,
}

export interface SocialProofState {
  data: SocialProofData
  loading: boolean
}

export function useSocialProof(): SocialProofState {
  const [data, setData] = useState<SocialProofData>(FALLBACK)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/sandbox-analytics?aggregate=true')
      .then(res => {
        if (!res.ok) throw new Error('non-ok')
        return res.json() as Promise<SocialProofData>
      })
      .then(json => {
        if (!cancelled) setData(json)
      })
      .catch(() => {
        // Keep fallback data — do not crash
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  return { data, loading }
}
