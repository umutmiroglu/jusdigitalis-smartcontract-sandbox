import { describe, it, expect } from 'vitest'
import {
  initCascadeState,
  runCascade,
  computeCapitalAtRisk,
  DEFAULT_DEPENDENCY_RULES,
} from '../../utils/cascadeEngine'
import type { ActiveContract } from '../../types/cascade'

function makeContract(overrides: Partial<ActiveContract> = {}): ActiveContract {
  return {
    id: 'test_1',
    botId: 'honest',
    botName: 'Mehmet Yılmaz',
    method: 'smart',
    coins: 200,
    status: 'active',
    round: 1,
    ...overrides,
  }
}

describe('initCascadeState', () => {
  it('boş state döndürür', () => {
    const state = initCascadeState()
    expect(state.contracts).toEqual([])
    expect(state.events).toEqual([])
    expect(state.totalCapitalAtRisk).toBe(0)
    expect(state.rules).toEqual(DEFAULT_DEPENDENCY_RULES)
  })

  it('özel kurallarla başlatılabilir', () => {
    const custom = [{ ifBotId: 'honest' as const, thenBotId: 'contractor' as const, contagionRate: 0.9 }]
    const state = initCascadeState(custom)
    expect(state.rules).toEqual(custom)
  })
})

describe('computeCapitalAtRisk', () => {
  it('aktif ve at_risk kontratları toplar', () => {
    const contracts: ActiveContract[] = [
      makeContract({ id: '1', status: 'active',    coins: 200 }),
      makeContract({ id: '2', status: 'at_risk',   coins: 150 }),
      makeContract({ id: '3', status: 'fulfilled', coins: 100 }),
      makeContract({ id: '4', status: 'defaulted', coins: 80  }),
    ]
    expect(computeCapitalAtRisk(contracts)).toBe(350)
  })

  it('tüm kontratlar fulfilled ise 0 döner', () => {
    const contracts: ActiveContract[] = [
      makeContract({ id: '1', status: 'fulfilled', coins: 200 }),
      makeContract({ id: '2', status: 'fulfilled', coins: 150 }),
    ]
    expect(computeCapitalAtRisk(contracts)).toBe(0)
  })

  it('boş liste için 0 döner', () => {
    expect(computeCapitalAtRisk([])).toBe(0)
  })
})

describe('runCascade', () => {
  it('bilinmeyen id için state değişmez', () => {
    const state = initCascadeState()
    const result = runCascade(state, 'nonexistent')
    expect(result.updatedContracts).toEqual([])
    expect(result.newEvents).toEqual([])
  })

  it('defaulted kontratın statusu güncellenir', () => {
    const contract = makeContract({ id: 'h1', botId: 'honest', status: 'active' })
    const state = { ...initCascadeState(), contracts: [contract] }
    const { updatedContracts } = runCascade(state, 'h1')
    expect(updatedContracts.find(c => c.id === 'h1')?.status).toBe('defaulted')
  })

  it('honest defaulted → opportunist at_risk kuralı tanımlı', () => {
    // contagionRate 1.0 olan deterministic kural kullan
    const rules = [{ ifBotId: 'honest' as const, thenBotId: 'opportunist' as const, contagionRate: 1.0 }]
    const honestContract    = makeContract({ id: 'h1', botId: 'honest',      status: 'active', round: 1 })
    const opportunistContract = makeContract({ id: 'o1', botId: 'opportunist', status: 'active', round: 1 })
    const state = { ...initCascadeState(rules), contracts: [honestContract, opportunistContract] }

    const { updatedContracts, newEvents } = runCascade(state, 'h1')

    expect(updatedContracts.find(c => c.id === 'h1')?.status).toBe('defaulted')
    expect(updatedContracts.find(c => c.id === 'o1')?.status).toBe('at_risk')
    expect(newEvents).toHaveLength(1)
    expect(newEvents[0].trigger).toBe('honest')
    expect(newEvents[0].affected).toContain('opportunist')
  })

  it('contagionRate 0.0 → hiç bulaşma olmaz', () => {
    const rules = [{ ifBotId: 'honest' as const, thenBotId: 'opportunist' as const, contagionRate: 0.0 }]
    const honestContract    = makeContract({ id: 'h1', botId: 'honest',      status: 'active' })
    const opportunistContract = makeContract({ id: 'o1', botId: 'opportunist', status: 'active' })
    const state = { ...initCascadeState(rules), contracts: [honestContract, opportunistContract] }

    const { updatedContracts, newEvents } = runCascade(state, 'h1')

    expect(updatedContracts.find(c => c.id === 'o1')?.status).toBe('active')
    expect(newEvents).toHaveLength(0)
  })

  it('fulfilled kontrat at_risk\'e düşmez', () => {
    const rules = [{ ifBotId: 'honest' as const, thenBotId: 'opportunist' as const, contagionRate: 1.0 }]
    const honestContract    = makeContract({ id: 'h1', botId: 'honest',      status: 'active'    })
    const opportunistContract = makeContract({ id: 'o1', botId: 'opportunist', status: 'fulfilled' })
    const state = { ...initCascadeState(rules), contracts: [honestContract, opportunistContract] }

    const { updatedContracts } = runCascade(state, 'h1')
    expect(updatedContracts.find(c => c.id === 'o1')?.status).toBe('fulfilled')
  })
})
