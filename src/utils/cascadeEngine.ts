import type { CascadeState, ActiveContract, CascadeEvent, DependencyRule } from '../types/cascade'
import type { BotId } from '../types'

// Varsayılan bağımlılık kuralları — Türkiye ticaret zinciri mantığı
// honest (tedarikçi) → opportunist (aracı) → contractor (son alıcı)
export const DEFAULT_DEPENDENCY_RULES: DependencyRule[] = [
  { ifBotId: 'honest',      thenBotId: 'opportunist', contagionRate: 0.6 },
  { ifBotId: 'opportunist', thenBotId: 'contractor',  contagionRate: 0.4 },
]

// CascadeState'i başlangıç değerleriyle oluştur
export function initCascadeState(rules: DependencyRule[] = DEFAULT_DEPENDENCY_RULES): CascadeState {
  return {
    contracts: [],
    rules,
    events: [],
    totalCapitalAtRisk: 0,
  }
}

// Toplam risk altındaki sermayeyi hesapla
export function computeCapitalAtRisk(contracts: ActiveContract[]): number {
  return contracts
    .filter(c => c.status === 'active' || c.status === 'at_risk')
    .reduce((sum, c) => sum + c.coins, 0)
}

// Bir kontrat defaulted olduğunda cascade'i hesapla
export function runCascade(
  state: CascadeState,
  defaultedId: string,
): { updatedContracts: ActiveContract[]; newEvents: CascadeEvent[] } {
  const defaultedContract = state.contracts.find(c => c.id === defaultedId)
  if (!defaultedContract) {
    return { updatedContracts: state.contracts, newEvents: [] }
  }

  const defaultedBotId: BotId = defaultedContract.botId

  // Bu bot'un tetiklediği kuralları bul
  const triggeredRules = state.rules.filter(r => r.ifBotId === defaultedBotId)

  const affected: BotId[] = []
  let contracts = state.contracts.map(c => {
    if (c.id === defaultedId) return { ...c, status: 'defaulted' as const }
    return c
  })

  for (const rule of triggeredRules) {
    // contagionRate olasılığına göre at_risk'e düşür
    if (Math.random() < rule.contagionRate) {
      contracts = contracts.map(c => {
        if (c.botId === rule.thenBotId && c.status === 'active') {
          affected.push(c.botId)
          return { ...c, status: 'at_risk' as const }
        }
        return c
      })
    }
  }

  const newEvents: CascadeEvent[] = []
  if (affected.length > 0) {
    const affectedNames = affected.join(', ')
    newEvents.push({
      round: defaultedContract.round,
      trigger: defaultedBotId,
      affected,
      description: `${defaultedBotId} battı → ${affectedNames} sıkıştı`,
    })
  }

  return {
    updatedContracts: contracts.map(c => ({
      ...c,
      status: c.status,
    })),
    newEvents,
  }
}
