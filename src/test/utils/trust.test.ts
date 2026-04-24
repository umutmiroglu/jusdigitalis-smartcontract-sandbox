import { describe, it, expect } from 'vitest'
import {
  initTrustScores,
  applyTrustUpdate,
  getReputationBadge,
  computePlayerReputation,
  computeTrustDiscount,
  botEvaluateContract,
} from '../../utils/trust'
import { BOTS } from '../../constants/bots'

describe('initTrustScores', () => {
  it('initializes all bots to 50', () => {
    const scores = initTrustScores()
    expect(scores.honest).toBe(50)
    expect(scores.opportunist).toBe(50)
    expect(scores.contractor).toBe(50)
  })
})

describe('applyTrustUpdate', () => {
  it('sc_success increases trust by 8', () => {
    const scores = initTrustScores()
    expect(applyTrustUpdate(scores, 'honest', 'sc_success').honest).toBe(58)
  })
  it('lawsuit decreases trust by 10', () => {
    const scores = initTrustScores()
    expect(applyTrustUpdate(scores, 'opportunist', 'lawsuit').opportunist).toBe(40)
  })
  it('never goes below 0', () => {
    const scores = { honest: 3, opportunist: 50, contractor: 50 }
    expect(applyTrustUpdate(scores, 'honest', 'lawsuit').honest).toBe(0)
  })
  it('never exceeds 100', () => {
    const scores = { honest: 97, opportunist: 50, contractor: 50 }
    expect(applyTrustUpdate(scores, 'honest', 'sc_success').honest).toBe(100)
  })
})

describe('getReputationBadge', () => {
  it('score 80+ is Güvenilir', () => {
    expect(getReputationBadge(80).label).toBe('Güvenilir')
  })
  it('score 60-79 is Orta', () => {
    expect(getReputationBadge(65).label).toBe('Orta')
  })
  it('score 40-59 is Şüpheli', () => {
    expect(getReputationBadge(45).label).toBe('Şüpheli')
  })
  it('score below 40 is Riskli', () => {
    expect(getReputationBadge(39).label).toBe('Riskli')
  })
})

describe('computePlayerReputation', () => {
  it('returns average of all scores', () => {
    const scores = { honest: 60, opportunist: 40, contractor: 50 }
    expect(computePlayerReputation(scores)).toBe(50)
  })
})

describe('computeTrustDiscount', () => {
  it('max trust gives max discount', () => {
    expect(computeTrustDiscount(100)).toBe(20)
  })
  it('zero trust gives zero discount', () => {
    expect(computeTrustDiscount(0)).toBe(0)
  })
})

describe('botEvaluateContract', () => {
  it('refuses very harsh terms', () => {
    const bot = BOTS.find(b => b.id === 'opportunist')!
    const result = botEvaluateContract(bot, { timeout: 2, penaltyRate: 90, useOracle: false }, 0)
    expect(result.refused).toBe(true)
  })
  it('accepts normal terms for honest bot', () => {
    const bot = BOTS.find(b => b.id === 'honest')!
    const result = botEvaluateContract(bot, { timeout: 30, penaltyRate: 20, useOracle: false }, 50)
    expect(result.refused).toBe(false)
  })
})
