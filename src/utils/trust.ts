import type { TrustScores, TrustEvent, ReputationBadge, Bot, ContractParams, BotEvalResult } from '../types'
import { BOTS } from '../constants/bots'
import { MAX_TRUST_SCORE, TRUST_DISCOUNT_MAX } from '../constants/game'

const TRUST_DELTA: Record<TrustEvent, number> = {
  sc_success:      +8,
  sc_fail:         -5,
  classic_success: +3,
  lawsuit:         -10,
  arbitration_win: +2,
}

export function initTrustScores(): TrustScores {
  return Object.fromEntries(BOTS.map(b => [b.id, 50])) as TrustScores
}

export function applyTrustUpdate(
  scores: TrustScores,
  botId: string,
  event: TrustEvent,
): TrustScores {
  const delta = TRUST_DELTA[event] ?? 0
  return {
    ...scores,
    [botId]: Math.max(0, Math.min(MAX_TRUST_SCORE, (scores[botId as keyof TrustScores] ?? 50) + delta)),
  }
}

export function getReputationBadge(s: number): ReputationBadge {
  if (s >= 80) return { label: 'Güvenilir', color: '#00d4aa' }
  if (s >= 60) return { label: 'Orta',      color: '#f39c12' }
  if (s >= 40) return { label: 'Şüpheli',   color: '#ff6b35' }
  return          { label: 'Riskli',       color: '#ff4444' }
}

export function computePlayerReputation(scores: TrustScores): number {
  const vals = Object.values(scores)
  if (!vals.length) return 50
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

export function computeTrustDiscount(trustScore: number): number {
  return Math.floor((trustScore / MAX_TRUST_SCORE) * TRUST_DISCOUNT_MAX)
}

export function botEvaluateContract(
  bot: Bot,
  params: ContractParams,
  trustScore = 50,
): BotEvalResult {
  const discount        = computeTrustDiscount(trustScore)
  const effectivePenalty = Math.max(0, params.penaltyRate - discount)
  const harshness       = (1 - params.timeout / 60) * 0.5 + (effectivePenalty / 100) * 0.5
  if (harshness > bot.riskTolerance + 0.4) {
    return { refused: true, priceMultiplier: 1, reason: 'Şartlar çok sert — bot reddetti.', discount, effectivePenalty }
  }
  if (harshness > bot.riskTolerance) {
    const bump = 1 + bot.priceFlexibility + (harshness - bot.riskTolerance) * 0.5
    return {
      refused: false,
      priceMultiplier: parseFloat(bump.toFixed(2)),
      reason: `Bot sert şartlar için %${Math.round((bump - 1) * 100)} zam istedi.`,
      discount,
      effectivePenalty,
    }
  }
  return { refused: false, priceMultiplier: 1, reason: null, discount, effectivePenalty }
}
