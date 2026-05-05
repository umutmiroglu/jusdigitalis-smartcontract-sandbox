import type { Bot, ContractParams, ContractMethod, EventEffect, YearEvent, AutopsyResult, DynamicReward, OpportunityCostHuman } from '../types'
import {
  COURT_FEE_RATE, ARBITRATION_FEE_RATE, MARKET_VARIANCE,
  INFLATION_BY_YEAR, KONKORDATO_CHANCE, MARKET_CRASH_PENALTY,
  LAWSUIT_START_YEAR,
} from '../constants/game'
import { YEAR_EVENT_POOL, ARB_EVENT_POOL } from '../constants/events'
import { JUDGE_BY_YEAR, JUDGE_INCONCLUSIVE, JUDGE_WEAK, JUDGE_STRONG } from '../constants/judge'

export function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function genContractId(): string {
  return 'JD-' + Math.random().toString(36).toUpperCase().slice(2, 8) + '-' + Date.now().toString(36).toUpperCase().slice(-4)
}

export function computeCourtFee(p: number): number {
  return Math.round(p * COURT_FEE_RATE)
}

export function computeArbitrationFee(p: number): number {
  return Math.round(p * ARBITRATION_FEE_RATE)
}

export function computeDynamicReward(
  bot: Bot,
  crashActive: boolean,
  eventEffect: EventEffect | null = null,
): DynamicReward {
  const mv = MARKET_VARIANCE[bot.id] ?? { base: 0.15, variance: 0.20 }
  let marketMod = (Math.random() - 0.4) * mv.variance
  if (crashActive) marketMod -= 0.08
  const profitRate = Math.max(0.02, mv.base + marketMod)
  let reward = Math.round(bot.basePrice * (1 + profitRate))
  if (eventEffect?.rewardBonus)   reward = Math.round(reward * (1 + eventEffect.rewardBonus))
  if (eventEffect?.rewardPenalty) reward = Math.round(reward * (1 - eventEffect.rewardPenalty))
  return { reward, delta: reward - bot.basePrice, profitRate }
}

export function computeSuccessRate(
  bot: Bot,
  params: ContractParams,
  crashActive: boolean,
  dominoBump = 0,
  eventEffect: EventEffect | null = null,
): number {
  let rate = bot.baseSuccessRate
  if (params.useOracle) rate = Math.min(rate + 0.35, 0.97)
  if (bot.id === 'opportunist' && params.timeout < 15) rate = Math.max(rate - 0.08, 0)
  if (crashActive) rate = Math.max(rate - MARKET_CRASH_PENALTY, 0.02)
  rate = Math.max(rate - dominoBump, 0.02)
  if (eventEffect?.successBonus)   rate = Math.min(rate + eventEffect.successBonus, 0.97)
  if (eventEffect?.scSuccessBonus) rate = Math.min(rate + eventEffect.scSuccessBonus * 0.6, 0.97)
  return rate
}

export function priceAtSimYear(base: number, simYear: number, rate = 0.09): number {
  const years = Math.max(0, simYear - LAWSUIT_START_YEAR)
  return Math.round(base * Math.pow(1 + rate, years))
}

export function computeClassicDirectRate(
  bot: Bot,
  crashActive: boolean,
  eventEffect: EventEffect | null = null,
): number {
  let rate = bot.baseSuccessRate * (crashActive ? 0.50 : 0.75)
  if (eventEffect?.successBonus) rate = Math.min(rate + eventEffect.successBonus * 0.5, 0.92)
  if (eventEffect?.crashActive)  rate *= 0.5
  return Math.max(rate, 0.02)
}

export function computeAutopsy(
  method: ContractMethod,
  bot: Bot,
  totalYears: number,
  won: boolean,
): AutopsyResult {
  const bp = bot.basePrice
  const courtFee   = computeCourtFee(bp)
  const inflMult   = INFLATION_BY_YEAR[Math.max(1, Math.min(totalYears, 10))] ?? 0.18
  const inflationLoss    = Math.floor(bp * (1 - inflMult))
  const yrs              = Math.max(totalYears, 1)
  const annualRate       = 0.18
  const opportunityCost  = Math.floor(bp * (Math.pow(1 + annualRate, yrs) - 1))
  const konkordatoRisk   = Math.round(KONKORDATO_CHANCE * 100)
  const showInflLoss     = won && totalYears > 0
  const showOppCost      = !won && totalYears > 0
  const effectiveInflLoss = showInflLoss ? inflationLoss : 0
  const effectiveOppCost  = showOppCost  ? opportunityCost : 0

  return {
    method, won, courtFee, inflationLoss, opportunityCost, konkordatoRisk,
    showInflLoss, showOppCost,
    scSaving: method !== 'smart' ? (inflationLoss + courtFee) : 0,
    totalClassicLoss: courtFee + effectiveInflLoss + effectiveOppCost,
    annualRatePct: Math.round(annualRate * 100),
    summary: method === 'smart'
      ? `Koşullu ifa sözleşmesi seçerek ${courtFee} JC harç + %${Math.round((1 - inflMult) * 100)} enflasyon kaybından korunuştunuz.`
      : totalYears === 0
        ? 'Klasik sözleşme başarıyla tamamlandı — karşı taraf yükümlülüğünü yerine getirdi.'
        : won
          ? `Davayı kazandınız — ancak ${totalYears} yılda paranın değeri %${Math.round((1 - inflMult) * 100)}'e düştü (enflasyon kaybı: ${inflationLoss} JC).`
          : `Dava kaybedildi. ${totalYears} yılda ${opportunityCost} JC fırsat maliyeti oluştu (%18 yıllık enflasyon-endeksli getiri kaçırıldı).`,
  }
}

export function computeOpportunityCostHuman(jc: number): OpportunityCostHuman {
  const hours = Math.round(jc / 12)
  return { hours, weeks: (hours / 40).toFixed(1) }
}

export function buildYearEvents(n: number, isArb = false): YearEvent[] {
  const pool = isArb ? ARB_EVENT_POOL : YEAR_EVENT_POOL
  return Array.from({ length: n }, (_, i) => {
    const y = i + 1
    const d = pool[y] ?? pool[3]
    return { year: y, events: d.events, winProb: d.winProb }
  })
}

export function getJudgeDialogue(year: number, winProb: number): string {
  if (winProb < 0.45) return pickRandom(JUDGE_WEAK)
  if (winProb < 0.55) return pickRandom(JUDGE_INCONCLUSIVE)
  if (winProb >= 0.65) return pickRandom(JUDGE_STRONG)
  const pool = JUDGE_BY_YEAR[year] ?? JUDGE_BY_YEAR[3]
  return pickRandom(pool)
}
