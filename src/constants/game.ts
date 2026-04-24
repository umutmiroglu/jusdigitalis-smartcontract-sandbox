export const INITIAL_COINS        = 1000
export const ORACLE_FEE           = 30
export const COURT_FEE_RATE       = 0.05
export const ARBITRATION_FEE_RATE = 0.03
export const LEGAL_INTEREST_RATE  = 0.09
export const TK_OPPORTUNITY_BASE  = 0.40
export const TK_OPPORTUNITY_FLOOR = 0.22
export const MARKET_CRASH_PENALTY = 0.30
export const KONKORDATO_CHANCE    = 0.15
export const DOMINO_FAILURE_BUMP  = 0.20
export const DOMINO_RECOVERY      = 0.05
export const MAX_TRUST_SCORE      = 100
export const TRUST_DISCOUNT_MAX   = 20
export const LS_KEY               = 'jus_digitalis_v27'
export const BANKRUPTCY_THRESHOLD = 100
export const LOAN_TRIGGER_EVERY   = 5
export const LAWSUIT_START_YEAR   = 2021

export const INFLATION_BY_YEAR: Record<number, number> = {
  1: 0.82, 2: 0.68, 3: 0.52, 4: 0.44, 5: 0.38,
  6: 0.33, 7: 0.29, 8: 0.25, 9: 0.22, 10: 0.18,
}

export const MARKET_VARIANCE: Record<string, { base: number; variance: number }> = {
  honest:      { base: 0.12, variance: 0.18 },
  opportunist: { base: 0.25, variance: 0.40 },
  contractor:  { base: 0.10, variance: 0.22 },
}

export const LAWSUIT_YEARS_BY_BOT: Record<string, { min: number; max: number }> = {
  honest:      { min: 2, max: 5 },
  opportunist: { min: 1, max: 4 },
  contractor:  { min: 6, max: 10 },
}

export const ARBITRATION_YEARS_BY_BOT: Record<string, { min: number; max: number }> = {
  honest:      { min: 1, max: 2 },
  opportunist: { min: 1, max: 2 },
  contractor:  { min: 1, max: 3 },
}
