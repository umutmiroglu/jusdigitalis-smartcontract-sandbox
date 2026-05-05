import type { BotId, ContractMethod } from './index'

export type ContractStatus = 'active' | 'fulfilled' | 'defaulted' | 'at_risk'

export interface ActiveContract {
  id: string
  botId: BotId
  botName: string
  method: ContractMethod
  coins: number
  status: ContractStatus
  round: number
}

export interface DependencyRule {
  ifBotId: BotId
  thenBotId: BotId
  contagionRate: number
}

export interface CascadeEvent {
  round: number
  trigger: BotId
  affected: BotId[]
  description: string
}

export interface CascadeState {
  contracts: ActiveContract[]
  rules: DependencyRule[]
  events: CascadeEvent[]
  totalCapitalAtRisk: number
}
