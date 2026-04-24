import { describe, it, expectTypeOf } from 'vitest'
import type { Bot, Lawyer, ContractParams, AutopsyResult, GameStats } from '../types'

describe('types', () => {
  it('Bot id is a known value', () => {
    expectTypeOf<Bot['id']>().toEqualTypeOf<'honest' | 'opportunist' | 'contractor'>()
  })
  it('ContractParams has required fields', () => {
    expectTypeOf<ContractParams>().toMatchTypeOf<{
      timeout: number
      penaltyRate: number
      useOracle: boolean
    }>()
  })
  it('AutopsyResult.method is ContractMethod', () => {
    expectTypeOf<AutopsyResult['method']>().toEqualTypeOf<'smart' | 'classic' | 'arbitration'>()
  })
  it('GameStats has numeric fields', () => {
    expectTypeOf<GameStats['wins']>().toEqualTypeOf<number>()
  })
  it('Lawyer id is a known value', () => {
    expectTypeOf<Lawyer['id']>().toEqualTypeOf<'rookie' | 'mid' | 'veteran'>()
  })
})
