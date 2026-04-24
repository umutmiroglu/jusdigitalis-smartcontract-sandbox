// ─── Primitive Aliases ────────────────────────────────────────────────────────
export type BotId = 'honest' | 'opportunist' | 'contractor'
export type LawyerId = 'rookie' | 'mid' | 'veteran'
export type FailureType = 'force_majeure' | 'fraud' | 'delay'
export type ContractMethod = 'smart' | 'classic' | 'arbitration'
export type TrustEvent = 'sc_success' | 'sc_fail' | 'classic_success' | 'lawsuit' | 'arbitration_win'
export type ABVariant = 'forceClassicFirst' | 'freeChoice' | 'aiAdvisorProminent'

export type AnalyticsEventName =
  | 'SESSION_START'
  | 'BOT_SELECT'
  | 'METHOD_CHOICE'
  | 'SC_ARCHITECT'
  | 'CONTRACT_OUTCOME'
  | 'COMPARISON_VIEW'
  | 'CTA_CLICK'
  | 'EXIT_INTENT'
  | 'SIM_DATA'
  | 'QUICK_DEMO_START'
  | 'QUICK_DEMO_COMPLETE'

// ─── Bot ─────────────────────────────────────────────────────────────────────
export interface BotDialogues {
  greet: string[]
  smart: string[]
  success: string[]
  fail: string[]
  loanRequest: string[]
  loanRepay: string[]
  loanDefault: string[]
}

export interface Bot {
  id: BotId
  name: string
  title: string
  contractType: string
  contractRef: string
  loanRepayRate: number
  loanAmount: number
  emoji: string
  color: string
  colorRgb: string
  risk: string
  riskColor: string
  basePrice: number
  baseReward: number
  baseSuccessRate: number
  delay: number
  catchphrase: string
  description: string
  riskTolerance: number
  priceFlexibility: number
  failureType: FailureType
  dialogues: BotDialogues
}

// ─── Lawyer ───────────────────────────────────────────────────────────────────
export interface Lawyer {
  id: LawyerId
  name: string
  title: string
  emoji: string
  color: string
  fee: number
  winMultiplier: number
  recoveryRate: number
  description: string
  dialogues: string[]
}

// ─── Events ──────────────────────────────────────────────────────────────────
export interface EventEffect {
  rewardBonus?: number
  rewardPenalty?: number
  successBonus?: number
  scSuccessBonus?: number
  crashActive?: boolean
  deliveryTimeMult?: number
  dominoBump?: number
  dominoBumpReduce?: number
  coinBonus?: number
}

export interface RandomEvent {
  id: string
  type: 'positive' | 'negative'
  emoji: string
  title: string
  description: string
  effect: EventEffect
}

export interface YearEventData {
  events: string[]
  winProb: number
}

export interface YearEvent {
  year: number
  events: string[]
  winProb: number
}

// ─── Legal ───────────────────────────────────────────────────────────────────
export interface LegalTerm {
  short: string
  definition: string
  detail: string
  ref: string
}

// ─── Contract ────────────────────────────────────────────────────────────────
export interface ContractParams {
  timeout: number
  penaltyRate: number
  useOracle: boolean
}

export interface BotEvalResult {
  refused: boolean
  priceMultiplier: number
  reason: string | null
  discount: number
  effectivePenalty: number
}

export interface DynamicReward {
  reward: number
  delta: number
  profitRate: number
}

export interface AutopsyResult {
  method: ContractMethod
  won: boolean
  courtFee: number
  inflationLoss: number
  opportunityCost: number
  konkordatoRisk: number
  showInflLoss: boolean
  showOppCost: boolean
  scSaving: number
  totalClassicLoss: number
  annualRatePct: number
  summary: string
}

// ─── Trust & Reputation ───────────────────────────────────────────────────────
export type TrustScores = Record<BotId, number>

export interface ReputationBadge {
  label: string
  color: string
}

// ─── Game State ───────────────────────────────────────────────────────────────
export interface GameStats {
  wins: number
  losses: number
  scUses: number
  classicUses: number
  concordatos: number
}

export interface PersistedState {
  coins: number
  trustScores: TrustScores
  stats: GameStats
  capitalProtected: number
  legalRisk: number
}

export interface OpportunityCostHuman {
  hours: number
  weeks: string
}
