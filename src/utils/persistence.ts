import type { PersistedState } from '../types'
import { LS_KEY } from '../constants/game'

export function loadPersisted(): PersistedState | null {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? 'null') as PersistedState | null
  } catch {
    return null
  }
}

export function savePersisted(data: PersistedState): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data))
  } catch {
    // localStorage kullanılamıyorsa sessizce yoksay
  }
}

export function clearPersisted(): void {
  try {
    localStorage.removeItem(LS_KEY)
  } catch {}
}
