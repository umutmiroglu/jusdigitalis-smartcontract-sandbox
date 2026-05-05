import { useState, useCallback } from 'react'
import type { ActiveContract, CascadeState, DependencyRule } from '../types/cascade'
import type { Bot, ContractMethod } from '../types'
import {
  initCascadeState,
  runCascade,
  computeCapitalAtRisk,
  DEFAULT_DEPENDENCY_RULES,
} from '../utils/cascadeEngine'

function generateId(): string {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function useCascadeState(rules: DependencyRule[] = DEFAULT_DEPENDENCY_RULES) {
  const [state, setState] = useState<CascadeState>(() => initCascadeState(rules))

  const addContract = useCallback((
    bot: Bot,
    method: ContractMethod,
    coins: number,
    round: number,
  ): ActiveContract => {
    const contract: ActiveContract = {
      id: generateId(),
      botId: bot.id,
      botName: bot.name,
      method,
      coins,
      status: 'active',
      round,
    }
    setState(prev => ({
      ...prev,
      contracts: [...prev.contracts, contract],
      totalCapitalAtRisk: computeCapitalAtRisk([...prev.contracts, contract]),
    }))
    return contract
  }, [])

  const resolveContract = useCallback((id: string, won: boolean) => {
    setState(prev => {
      if (won) {
        const updatedContracts = prev.contracts.map(c =>
          c.id === id ? { ...c, status: 'fulfilled' as const } : c,
        )
        return {
          ...prev,
          contracts: updatedContracts,
          totalCapitalAtRisk: computeCapitalAtRisk(updatedContracts),
        }
      }

      const { updatedContracts, newEvents } = runCascade(prev, id)
      return {
        ...prev,
        contracts: updatedContracts,
        events: [...prev.events, ...newEvents],
        totalCapitalAtRisk: computeCapitalAtRisk(updatedContracts),
      }
    })
  }, [])

  const resetCascade = useCallback(() => {
    setState(initCascadeState(rules))
  }, [rules])

  return {
    contracts: state.contracts,
    events: state.events,
    totalCapitalAtRisk: state.totalCapitalAtRisk,
    addContract,
    resolveContract,
    resetCascade,
  }
}
