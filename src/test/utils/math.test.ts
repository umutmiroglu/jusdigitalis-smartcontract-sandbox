import { describe, it, expect } from 'vitest'
import {
  pickRandom,
  genContractId,
  computeCourtFee,
  computeArbitrationFee,
  computeDynamicReward,
  computeSuccessRate,
  computeClassicDirectRate,
  computeAutopsy,
  computeOpportunityCostHuman,
  buildYearEvents,
} from '../../utils/math'
import { BOTS } from '../../constants/bots'

describe('pickRandom', () => {
  it('returns an element from the array', () => {
    const arr = ['a', 'b', 'c']
    expect(arr).toContain(pickRandom(arr))
  })
  it('works with single-element array', () => {
    expect(pickRandom(['x'])).toBe('x')
  })
})

describe('genContractId', () => {
  it('starts with JD-', () => {
    expect(genContractId()).toMatch(/^JD-/)
  })
  it('produces unique IDs', () => {
    expect(genContractId()).not.toBe(genContractId())
  })
})

describe('computeCourtFee', () => {
  it('is 5% of price', () => {
    expect(computeCourtFee(1000)).toBe(50)
    expect(computeCourtFee(200)).toBe(10)
  })
})

describe('computeArbitrationFee', () => {
  it('is 3% of price', () => {
    expect(computeArbitrationFee(1000)).toBe(30)
  })
})

describe('computeDynamicReward', () => {
  it('returns reward greater than 0', () => {
    const bot = BOTS[0]
    const { reward } = computeDynamicReward(bot, false)
    expect(reward).toBeGreaterThan(0)
  })
  it('reward is lower on average when crash is active', () => {
    const bot = BOTS[1]
    const runs = 40
    let crashTotal = 0
    let normalTotal = 0
    for (let i = 0; i < runs; i++) {
      crashTotal  += computeDynamicReward(bot, true).reward
      normalTotal += computeDynamicReward(bot, false).reward
    }
    expect(crashTotal).toBeLessThan(normalTotal)
  })
})

describe('computeSuccessRate', () => {
  it('oracle increases success rate', () => {
    const bot = BOTS[0]
    const params = { timeout: 30, penaltyRate: 20, useOracle: false }
    const without   = computeSuccessRate(bot, params, false)
    const withOracle = computeSuccessRate(bot, { ...params, useOracle: true }, false)
    expect(withOracle).toBeGreaterThan(without)
  })
  it('crash reduces success rate', () => {
    const bot = BOTS[0]
    const params = { timeout: 30, penaltyRate: 20, useOracle: false }
    expect(computeSuccessRate(bot, params, true)).toBeLessThan(computeSuccessRate(bot, params, false))
  })
  it('result is between 0.02 and 0.97', () => {
    const bot = BOTS[1]
    const params = { timeout: 5, penaltyRate: 50, useOracle: false }
    const rate = computeSuccessRate(bot, params, true, 0.5)
    expect(rate).toBeGreaterThanOrEqual(0.02)
    expect(rate).toBeLessThanOrEqual(0.97)
  })
})

describe('computeClassicDirectRate', () => {
  it('returns lower rate when crash active', () => {
    const bot = BOTS[0]
    expect(computeClassicDirectRate(bot, true)).toBeLessThan(computeClassicDirectRate(bot, false))
  })
  it('rate is at least 0.02', () => {
    expect(computeClassicDirectRate(BOTS[1], true)).toBeGreaterThanOrEqual(0.02)
  })
})

describe('computeAutopsy', () => {
  it('classic scSaving is positive', () => {
    const result = computeAutopsy('classic', BOTS[0], 3, false)
    expect(result.scSaving).toBeGreaterThan(0)
  })
  it('smart scSaving is 0', () => {
    const result = computeAutopsy('smart', BOTS[0], 3, true)
    expect(result.scSaving).toBe(0)
  })
  it('summary string is non-empty', () => {
    const result = computeAutopsy('classic', BOTS[0], 5, true)
    expect(result.summary.length).toBeGreaterThan(0)
  })
})

describe('buildYearEvents', () => {
  it('returns correct number of years', () => {
    expect(buildYearEvents(5)).toHaveLength(5)
  })
  it('each event has year, events array, winProb', () => {
    const [first] = buildYearEvents(3)
    expect(first.year).toBe(1)
    expect(Array.isArray(first.events)).toBe(true)
    expect(typeof first.winProb).toBe('number')
  })
})

describe('computeOpportunityCostHuman', () => {
  it('converts JC to hours and weeks', () => {
    const result = computeOpportunityCostHuman(120)
    expect(result.hours).toBe(10)
    expect(typeof result.weeks).toBe('string')
  })
})
