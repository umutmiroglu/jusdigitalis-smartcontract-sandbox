# Phase 1 — TypeScript + Modüler src/ Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** v2_7.jsx'i silmeden yeni `src/` klasöründe TypeScript + modüler yapıya geçmek; tüm mantık typed modüllere taşındıktan sonra v2_7.jsx kaldırılır.

**Architecture:** Temiz Port yaklaşımı — v2_7.jsx kaynak referans olarak kullanılır, her modül sırasıyla oluşturulur (types → constants → utils → hooks → components → App). Vitest + React Testing Library ile utils ve hooks için TDD.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Vitest, @testing-library/react, @testing-library/user-event

---

## Kaynak Referans

Her adımda `v2_7.jsx` açık tutulmalı. Dosyanın ilk ~400 satırı constants + utils içerir, geri kalanı component'ler.

---

## Task 1: TypeScript + Test Framework Kurulumu

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts` (vite.config.js'in yerini alır)
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Delete: `vite.config.js` (task sonunda)

- [ ] **Step 1: TypeScript ve test bağımlılıklarını yükle**

```bash
cd C:/Users/UmutCan/test-proje
npm install --save-dev typescript @types/react @types/react-dom vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Beklenen çıktı: `added N packages` mesajı, hata yok.

- [ ] **Step 2: tsconfig.json oluştur**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: tsconfig.node.json oluştur**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: vite.config.ts oluştur**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

Ardından vite.config.js sil:
```bash
rm C:/Users/UmutCan/test-proje/vite.config.js
```

- [ ] **Step 5: vitest.config.ts oluştur**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/utils/**', 'src/hooks/**'],
    },
  },
})
```

- [ ] **Step 6: src/test/setup.ts oluştur**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 7: package.json scripts güncelle**

`"scripts"` bölümüne ekle:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 8: Kurulumu doğrula**

```bash
cd C:/Users/UmutCan/test-proje && npx tsc --noEmit 2>&1 | head -5
```

Beklenen: Henüz `src/` yoksa "no input files" benzeri mesaj — hata değil.

- [ ] **Step 9: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts vitest.config.ts src/test/setup.ts
git commit -m "chore: add TypeScript + Vitest setup"
```

---

## Task 2: Merkezi Tip Tanımları

**Files:**
- Create: `src/types/index.ts`
- Create: `src/test/types.test.ts` (type-level smoke test)

- [ ] **Step 1: Failing type test yaz**

`src/test/types.test.ts`:
```typescript
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
    expectTypeOf<GameStats['totalContracts']>().toBeNumber()
  })
})
```

- [ ] **Step 2: Testi çalıştır, FAIL olduğunu doğrula**

```bash
cd C:/Users/UmutCan/test-proje && npx vitest run src/test/types.test.ts 2>&1 | tail -5
```

Beklenen: `Cannot find module '../types'`

- [ ] **Step 3: src/types/index.ts oluştur**

```typescript
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
  totalContracts: number
  successfulContracts: number
  smartContractsUsed: number
  totalEarned: number
  totalLost: number
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
```

- [ ] **Step 4: Testi tekrar çalıştır, PASS olduğunu doğrula**

```bash
cd C:/Users/UmutCan/test-proje && npx vitest run src/test/types.test.ts 2>&1 | tail -5
```

Beklenen: `✓ 4 tests passed`

- [ ] **Step 5: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/types/index.ts src/test/types.test.ts
git commit -m "feat: add TypeScript type definitions"
```

---

## Task 3: Constants

**Files:**
- Create: `src/constants/game.ts`
- Create: `src/constants/bots.ts`
- Create: `src/constants/lawyers.ts`
- Create: `src/constants/events.ts`
- Create: `src/constants/judge.ts`
- Create: `src/constants/legalTerms.ts`

Bu task'ta test yoktur — constants saf veri, mantık yok. Sonraki task'lardaki utils testleri bunları dolaylı test eder.

- [ ] **Step 1: src/constants/game.ts oluştur**

v2_7.jsx satır 16-46'dan port et:
```typescript
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
  1:0.82, 2:0.68, 3:0.52, 4:0.44, 5:0.38,
  6:0.33, 7:0.29, 8:0.25, 9:0.22, 10:0.18,
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
```

- [ ] **Step 2: src/constants/bots.ts oluştur**

v2_7.jsx satır 173-234'den port et (BOTS dizisi). Tip ekleyerek:
```typescript
import type { Bot } from '../types'

export const BOTS = [
  // Mehmet Yılmaz — v2_7.jsx satır 175-193 içeriğini buraya kopyala
  // Kerem Aslan   — v2_7.jsx satır 195-212 içeriğini buraya kopyala
  // İbrahim Çelik — v2_7.jsx satır 214-233 içeriğini buraya kopyala
] as const satisfies Bot[]
```

> NOT: Her bot objesinin tam içeriği v2_7.jsx satır 173-234 arasındadır. Kopyala ve TypeScript tip doğrulamasından geç.

- [ ] **Step 3: src/constants/lawyers.ts oluştur**

v2_7.jsx satır 236-240'dan port et:
```typescript
import type { Lawyer } from '../types'

export const LAWYERS = [
  // v2_7.jsx satır 237-239 içeriğini buraya kopyala
] as const satisfies Lawyer[]
```

- [ ] **Step 4: src/constants/events.ts oluştur**

v2_7.jsx satır 242-275'den port et:
```typescript
import type { RandomEvent, YearEventData } from '../types'

export const RANDOM_EVENTS = [
  // v2_7.jsx satır 243-253 içeriğini buraya kopyala
] as const satisfies RandomEvent[]

export const YEAR_EVENT_POOL: Record<number, YearEventData> = {
  // v2_7.jsx satır 255-266 içeriğini buraya kopyala
}

export const ARB_EVENT_POOL: Record<number, YearEventData> = {
  // v2_7.jsx satır 267-270 içeriğini buraya kopyala
}
```

- [ ] **Step 5: src/constants/judge.ts oluştur**

v2_7.jsx satır 48-88'den port et:
```typescript
export const JUDGE_NAME  = 'Hakim Bey'
export const JUDGE_EMOJI = '👨‍⚖️'

export const JUDGE_BY_YEAR: Record<number, string[]> = {
  // v2_7.jsx satır 52-62 içeriğini buraya kopyala
}

export const JUDGE_INCONCLUSIVE: string[] = [
  // v2_7.jsx satır 65-70 içeriğini buraya kopyala
]

export const JUDGE_WEAK: string[] = [
  // v2_7.jsx satır 72-75 içeriğini buraya kopyala
]

export const JUDGE_STRONG: string[] = [
  // v2_7.jsx satır 77-80 içeriğini buraya kopyala
]
```

- [ ] **Step 6: src/constants/legalTerms.ts oluştur**

v2_7.jsx satır 91-122'den port et:
```typescript
import type { LegalTerm } from '../types'

export const LEGAL_TERMS: Record<string, LegalTerm> = {
  // v2_7.jsx satır 92-122 içeriğini buraya kopyala
}
```

- [ ] **Step 7: TypeScript kontrolü**

```bash
cd C:/Users/UmutCan/test-proje && npx tsc --noEmit 2>&1 | head -20
```

Beklenen: Hata yoksa sessiz çıktı. Tip hatası varsa düzelt, ileri geçme.

- [ ] **Step 8: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/constants/
git commit -m "feat: add typed constants (bots, lawyers, events, judge, legalTerms)"
```

---

## Task 4: Utils (TDD)

**Files:**
- Create: `src/utils/math.ts`
- Create: `src/utils/trust.ts`
- Create: `src/utils/persistence.ts`
- Create: `src/utils/analytics.ts`
- Create: `src/test/utils/math.test.ts`
- Create: `src/test/utils/trust.test.ts`

- [ ] **Step 1: math.ts için failing testleri yaz**

`src/test/utils/math.test.ts`:
```typescript
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
  it('reward is lower when crash is active', () => {
    const bot = BOTS[1] // opportunist — highest variance
    const runs = 20
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
    const without = computeSuccessRate(bot, params, false)
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

describe('computeAutopsy', () => {
  it('smart method scSaving equals courtFee + inflationLoss when won', () => {
    const result = computeAutopsy('classic', BOTS[0], 3, false)
    expect(result.scSaving).toBeGreaterThan(0)
  })
  it('smart method scSaving is 0', () => {
    const result = computeAutopsy('smart', BOTS[0], 3, true)
    expect(result.scSaving).toBe(0)
  })
})

describe('buildYearEvents', () => {
  it('returns correct number of years', () => {
    const events = buildYearEvents(5)
    expect(events).toHaveLength(5)
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
```

- [ ] **Step 2: Testleri çalıştır, FAIL olduğunu doğrula**

```bash
cd C:/Users/UmutCan/test-proje && npx vitest run src/test/utils/math.test.ts 2>&1 | tail -5
```

Beklenen: `Cannot find module '../../utils/math'`

- [ ] **Step 3: src/utils/math.ts oluştur**

v2_7.jsx satır 272-357'den port et:
```typescript
import type { Bot, ContractParams, ContractMethod, EventEffect, YearEvent } from '../types'
import {
  COURT_FEE_RATE, ARBITRATION_FEE_RATE, MARKET_VARIANCE,
  INFLATION_BY_YEAR, KONKORDATO_CHANCE, MARKET_CRASH_PENALTY,
  LAWSUIT_START_YEAR,
} from '../constants/game'
import { YEAR_EVENT_POOL, ARB_EVENT_POOL } from '../constants/events'

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
): { reward: number; delta: number; profitRate: number } {
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

export function priceAtSimYear(base: number, simYear: number, rate = 0.09): number {
  const years = Math.max(0, simYear - LAWSUIT_START_YEAR)
  return Math.round(base * Math.pow(1 + rate, years))
}

export function computeAutopsy(
  method: ContractMethod,
  bot: Bot,
  totalYears: number,
  won: boolean,
): import('../types').AutopsyResult {
  const bp = bot.basePrice
  const courtFee = computeCourtFee(bp)
  const inflMult = INFLATION_BY_YEAR[Math.max(1, Math.min(totalYears, 10))] ?? 0.18
  const inflationLoss = Math.floor(bp * (1 - inflMult))
  const yrs = Math.max(totalYears, 1)
  const annualRate = 0.18
  const opportunityCost = Math.floor(bp * (Math.pow(1 + annualRate, yrs) - 1))
  const konkordatoRisk = Math.round(KONKORDATO_CHANCE * 100)
  const showInflLoss = won && totalYears > 0
  const showOppCost  = !won && totalYears > 0
  const effectiveInflLoss = showInflLoss ? inflationLoss : 0
  const effectiveOppCost  = showOppCost  ? opportunityCost : 0
  return {
    method, won, courtFee, inflationLoss, opportunityCost, konkordatoRisk,
    showInflLoss, showOppCost,
    scSaving: method !== 'smart' ? (inflationLoss + courtFee) : 0,
    totalClassicLoss: courtFee + effectiveInflLoss + effectiveOppCost,
    annualRatePct: Math.round(annualRate * 100),
    summary: method === 'smart'
      ? `Smart Contract seçerek ${courtFee} JC harç + %${Math.round((1 - inflMult) * 100)} enflasyon kaybından korunuştunuz.`
      : totalYears === 0
        ? 'Klasik sözleşme başarıyla tamamlandı — karşı taraf yükümlülüğünü yerine getirdi.'
        : won
          ? `Davayı kazandınız — ancak ${totalYears} yılda paranın değeri %${Math.round((1 - inflMult) * 100)}'e düştü (enflasyon kaybı: ${inflationLoss} JC).`
          : `Dava kaybedildi. ${totalYears} yılda ${opportunityCost} JC fırsat maliyeti oluştu (%18 yıllık enflasyon-endeksli getiri kaçırıldı).`,
  }
}

export function computeOpportunityCostHuman(jc: number): { hours: number; weeks: string } {
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
  // v2_7.jsx satır 82-88'den port et
  // pickRandom(JUDGE_WEAK/INCONCLUSIVE/STRONG/JUDGE_BY_YEAR[year]) mantığı
  const { JUDGE_BY_YEAR, JUDGE_INCONCLUSIVE, JUDGE_WEAK, JUDGE_STRONG } = require('../constants/judge')
  if (winProb < 0.45) return pickRandom(JUDGE_WEAK)
  if (winProb < 0.55) return pickRandom(JUDGE_INCONCLUSIVE)
  if (winProb >= 0.65) return pickRandom(JUDGE_STRONG)
  const pool = JUDGE_BY_YEAR[year] ?? JUDGE_BY_YEAR[3]
  return pickRandom(pool)
}
```

> NOT: `getJudgeDialogue`'daki `require` ESM'de çalışmaz — düzelt: import'ları dosya üstüne taşı.

Düzeltilmiş getJudgeDialogue (dosya başına import ekle):
```typescript
import { JUDGE_BY_YEAR, JUDGE_INCONCLUSIVE, JUDGE_WEAK, JUDGE_STRONG } from '../constants/judge'

export function getJudgeDialogue(year: number, winProb: number): string {
  if (winProb < 0.45) return pickRandom(JUDGE_WEAK)
  if (winProb < 0.55) return pickRandom(JUDGE_INCONCLUSIVE)
  if (winProb >= 0.65) return pickRandom(JUDGE_STRONG)
  const pool = JUDGE_BY_YEAR[year] ?? JUDGE_BY_YEAR[3]
  return pickRandom(pool)
}
```

- [ ] **Step 4: Testleri çalıştır, PASS olduğunu doğrula**

```bash
cd C:/Users/UmutCan/test-proje && npx vitest run src/test/utils/math.test.ts 2>&1 | tail -10
```

Beklenen: Tüm testler PASS.

- [ ] **Step 5: trust.ts için failing testleri yaz**

`src/test/utils/trust.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import {
  initTrustScores,
  applyTrustUpdate,
  getReputationBadge,
  computePlayerReputation,
} from '../../utils/trust'

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
    const updated = applyTrustUpdate(scores, 'honest', 'sc_success')
    expect(updated.honest).toBe(58)
  })
  it('lawsuit decreases trust by 10', () => {
    const scores = initTrustScores()
    const updated = applyTrustUpdate(scores, 'opportunist', 'lawsuit')
    expect(updated.opportunist).toBe(40)
  })
  it('never goes below 0', () => {
    const scores = { honest: 3, opportunist: 50, contractor: 50 }
    const updated = applyTrustUpdate(scores, 'honest', 'lawsuit')
    expect(updated.honest).toBe(0)
  })
  it('never exceeds 100', () => {
    const scores = { honest: 97, opportunist: 50, contractor: 50 }
    const updated = applyTrustUpdate(scores, 'honest', 'sc_success')
    expect(updated.honest).toBe(100)
  })
})

describe('getReputationBadge', () => {
  it('score 80+ is Güvenilir', () => {
    expect(getReputationBadge(80).label).toBe('Güvenilir')
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
```

- [ ] **Step 6: src/utils/trust.ts oluştur**

v2_7.jsx satır 359-373'den port et:
```typescript
import type { TrustScores, TrustEvent, ReputationBadge } from '../types'
import { BOTS } from '../constants/bots'
import { MAX_TRUST_SCORE, TRUST_DISCOUNT_MAX } from '../constants/game'

const TRUST_DELTA: Record<TrustEvent, number> = {
  sc_success:       +8,
  sc_fail:          -5,
  classic_success:  +3,
  lawsuit:          -10,
  arbitration_win:  +2,
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
  bot: import('../types').Bot,
  params: import('../types').ContractParams,
  trustScore = 50,
): import('../types').BotEvalResult {
  const discount = computeTrustDiscount(trustScore)
  const effectivePenalty = Math.max(0, params.penaltyRate - discount)
  const harshness = (1 - params.timeout / 60) * 0.5 + (effectivePenalty / 100) * 0.5
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
```

- [ ] **Step 7: Trust testlerini çalıştır, PASS olduğunu doğrula**

```bash
cd C:/Users/UmutCan/test-proje && npx vitest run src/test/utils/trust.test.ts 2>&1 | tail -10
```

Beklenen: Tüm testler PASS.

- [ ] **Step 8: src/utils/persistence.ts oluştur**

v2_7.jsx satır 169-170'den port et:
```typescript
import type { PersistedState } from '../types'
import { LS_KEY } from '../constants/game'

export function loadPersisted(): PersistedState | null {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? 'null') as PersistedState | null
  } catch {
    return null
  }
}

export function savePersisted(data: PersistedState): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data))
  } catch {
    // localStorage kullanılamıyorsa sessizce yoksay
  }
}

export function clearPersisted(): void {
  try {
    localStorage.removeItem(LS_KEY)
  } catch {}
}
```

- [ ] **Step 9: src/utils/analytics.ts oluştur**

v2_7.jsx satır 124-167'den port et:
```typescript
import type { AnalyticsEventName } from '../types'

const ANALYTICS_URL = '/api/sandbox-analytics'
const SIM_LOG_KEY   = 'jd_sim_log'
const SIM_LOG_MAX   = 100
const AB_KEY        = 'jd_ab'
const QUEUE_KEY     = 'jd_aq'

export type ABVariant = 'forceClassicFirst' | 'freeChoice' | 'aiAdvisorProminent'

let _queue: object[] = []

// Startup: flush any queued events from previous sessions
;(function loadOfflineQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (raw) { _queue = JSON.parse(raw); flush() }
  } catch {}
})()

function flush(): void {
  if (!_queue.length) return
  const batch = [..._queue]
  _queue = []
  try { localStorage.removeItem(QUEUE_KEY) } catch {}
  fetch(ANALYTICS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({ events: batch }),
  }).catch(() => {
    _queue = [...batch, ..._queue]
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(_queue)) } catch {}
  })
}

export function track(eventName: AnalyticsEventName, data: Record<string, unknown> = {}): void {
  _queue.push({ event: eventName, ts: Date.now(), ...data })
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(_queue)) } catch {}
  flush()
}

export function logSimulation(data: Record<string, unknown>): void {
  const sessionId = getSessionId()
  const entry = { ts: Date.now(), sessionId, ...data }
  try {
    const raw = localStorage.getItem(SIM_LOG_KEY)
    const log: object[] = raw ? JSON.parse(raw) : []
    log.push(entry)
    if (log.length > SIM_LOG_MAX) log.splice(0, log.length - SIM_LOG_MAX)
    localStorage.setItem(SIM_LOG_KEY, JSON.stringify(log))
  } catch {}
  track('SIM_DATA', entry)
}

let _sessionId: string | null = null
function getSessionId(): string {
  if (!_sessionId) _sessionId = Math.random().toString(36).slice(2, 10).toUpperCase()
  return _sessionId
}

export function getABVariant(): ABVariant {
  try {
    const v = localStorage.getItem(AB_KEY) as ABVariant | null
    if (v) return v
  } catch {}
  const variants: ABVariant[] = ['forceClassicFirst', 'freeChoice', 'aiAdvisorProminent']
  const v = variants[Math.floor(Math.random() * 3)]
  try { localStorage.setItem(AB_KEY, v) } catch {}
  return v
}
```

- [ ] **Step 10: Tüm utils testlerini çalıştır**

```bash
cd C:/Users/UmutCan/test-proje && npx vitest run src/test/utils/ 2>&1 | tail -10
```

Beklenen: Tüm testler PASS.

- [ ] **Step 11: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/utils/ src/test/utils/
git commit -m "feat: add typed utils with tests (math, trust, persistence, analytics)"
```

---

## Task 5: Custom Hooks

**Files:**
- Create: `src/hooks/useCoinAnimation.ts`
- Create: `src/hooks/useTimeTunnel.ts`
- Create: `src/hooks/useGameState.ts`
- Create: `src/test/hooks/useCoinAnimation.test.ts`

- [ ] **Step 1: useCoinAnimation için failing test yaz**

`src/test/hooks/useCoinAnimation.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCoinAnimation } from '../../hooks/useCoinAnimation'

describe('useCoinAnimation', () => {
  it('isAnimating starts false', () => {
    const { result } = renderHook(() => useCoinAnimation())
    expect(result.current.isAnimating).toBe(false)
  })
  it('queuing an animation sets isAnimating to true', () => {
    const { result } = renderHook(() => useCoinAnimation())
    act(() => { result.current.queueAnimation(100) })
    expect(result.current.isAnimating).toBe(true)
  })
  it('currentDelta reflects queued value', () => {
    const { result } = renderHook(() => useCoinAnimation())
    act(() => { result.current.queueAnimation(250) })
    expect(result.current.currentDelta).toBe(250)
  })
})
```

- [ ] **Step 2: Testi çalıştır, FAIL olduğunu doğrula**

```bash
cd C:/Users/UmutCan/test-proje && npx vitest run src/test/hooks/useCoinAnimation.test.ts 2>&1 | tail -5
```

- [ ] **Step 3: src/hooks/useCoinAnimation.ts oluştur**

```typescript
import { useState, useRef, useCallback } from 'react'

interface CoinAnimationState {
  isAnimating: boolean
  currentDelta: number
  queueAnimation: (delta: number) => void
}

export function useCoinAnimation(): CoinAnimationState {
  const [isAnimating, setIsAnimating]   = useState(false)
  const [currentDelta, setCurrentDelta] = useState(0)
  const queueRef = useRef<number[]>([])
  const runningRef = useRef(false)

  const processQueue = useCallback(() => {
    if (runningRef.current || queueRef.current.length === 0) return
    runningRef.current = true
    const delta = queueRef.current.shift()!
    setCurrentDelta(delta)
    setIsAnimating(true)
    setTimeout(() => {
      setIsAnimating(false)
      setCurrentDelta(0)
      runningRef.current = false
      processQueue()
    }, 600)
  }, [])

  const queueAnimation = useCallback((delta: number) => {
    queueRef.current.push(delta)
    processQueue()
  }, [processQueue])

  return { isAnimating, currentDelta, queueAnimation }
}
```

- [ ] **Step 4: Testi çalıştır, PASS olduğunu doğrula**

```bash
cd C:/Users/UmutCan/test-proje && npx vitest run src/test/hooks/useCoinAnimation.test.ts 2>&1 | tail -5
```

- [ ] **Step 5: src/hooks/useTimeTunnel.ts oluştur**

v2_7.jsx'teki TimeTunnel state mantığını buraya çıkar. Hook arayüzü:

```typescript
import { useState, useCallback } from 'react'
import type { YearEvent } from '../types'

interface TimeTunnelState {
  active: boolean
  currentYear: number
  totalYears: number
  events: YearEvent[]
  currentEvent: string | null
  winProb: number
  start: (events: YearEvent[]) => void
  advanceYear: () => void
  reset: () => void
}

export function useTimeTunnel(): TimeTunnelState {
  const [active, setActive]             = useState(false)
  const [currentYear, setCurrentYear]   = useState(0)
  const [totalYears, setTotalYears]     = useState(0)
  const [events, setEvents]             = useState<YearEvent[]>([])
  const [currentEvent, setCurrentEvent] = useState<string | null>(null)
  const [winProb, setWinProb]           = useState(0.5)

  const start = useCallback((yearEvents: YearEvent[]) => {
    setEvents(yearEvents)
    setTotalYears(yearEvents.length)
    setCurrentYear(0)
    setActive(true)
  }, [])

  const advanceYear = useCallback(() => {
    setCurrentYear(prev => {
      const next = prev + 1
      const ev = events[next - 1]
      if (ev) {
        const { pickRandom } = require('../utils/math')
        setCurrentEvent(pickRandom(ev.events))
        setWinProb(ev.winProb)
      }
      return next
    })
  }, [events])

  const reset = useCallback(() => {
    setActive(false)
    setCurrentYear(0)
    setTotalYears(0)
    setEvents([])
    setCurrentEvent(null)
    setWinProb(0.5)
  }, [])

  return { active, currentYear, totalYears, events, currentEvent, winProb, start, advanceYear, reset }
}
```

> NOT: `require` yerine import kullan. `advanceYear` içindeki `pickRandom` çağrısını dosya başına import olarak taşı.

- [ ] **Step 6: src/hooks/useGameState.ts oluştur**

Bu hook v2_7.jsx'teki tüm `useState` çağrılarını bir araya getirir. v2_7.jsx'in ana component'ini (JusDigitalis fonksiyonu) oku, tüm state değişkenlerini listele ve typed bir hook haline getir:

```typescript
import { useState, useReducer, useCallback, useEffect } from 'react'
import type { Bot, Lawyer, ContractParams, GameStats, TrustScores, PersistedState } from '../types'
import { INITIAL_COINS, DOMINO_RECOVERY, LOAN_TRIGGER_EVERY } from '../constants/game'
import { initTrustScores, applyTrustUpdate } from '../utils/trust'
import { loadPersisted, savePersisted } from '../utils/persistence'
import { track } from '../utils/analytics'
import { BOTS } from '../constants/bots'

function initStats(): GameStats {
  return { totalContracts: 0, successfulContracts: 0, smartContractsUsed: 0, totalEarned: 0, totalLost: 0 }
}

export interface GameState {
  coins: number
  trustScores: TrustScores
  stats: GameStats
  capitalProtected: number
  legalRisk: number
  dominoBumps: number
  crashActive: boolean
  contractCount: number
  selectedBot: Bot | null
  selectedLawyer: Lawyer | null
  contractParams: ContractParams
  phase: 'select' | 'configure' | 'tunnel' | 'result' | 'autopsy' | 'bankrupt'
  showLoanModal: boolean
  pendingLoanBot: Bot | null
}

// v2_7.jsx'teki tüm useState'leri burada toplayarak tek bir nesne döndür.
// Tam implementasyon için v2_7.jsx'in JusDigitalis component fonksiyonunu referans al.
export function useGameState(): GameState & {
  setCoins: (n: number) => void
  setPhase: (p: GameState['phase']) => void
  selectBot: (bot: Bot) => void
  selectLawyer: (lawyer: Lawyer) => void
  updateParams: (params: Partial<ContractParams>) => void
  applyTrust: (botId: string, event: Parameters<typeof applyTrustUpdate>[2]) => void
  addDominoBump: (amount: number) => void
  reduceDominoBump: () => void
  setCrash: (active: boolean) => void
  openLoanModal: (bot: Bot) => void
  closeLoanModal: () => void
  incrementContract: () => void
  resetGame: () => void
} {
  const persisted = loadPersisted()

  const [coins, setCoins]                     = useState(persisted?.coins ?? INITIAL_COINS)
  const [trustScores, setTrustScores]         = useState<TrustScores>(persisted?.trustScores ?? initTrustScores())
  const [stats, setStats]                     = useState<GameStats>(persisted?.stats ?? initStats())
  const [capitalProtected, setCapProtected]   = useState(persisted?.capitalProtected ?? 0)
  const [legalRisk, setLegalRisk]             = useState(persisted?.legalRisk ?? 0)
  const [dominoBumps, setDominoBumps]         = useState(0)
  const [crashActive, setCrashActive]         = useState(false)
  const [contractCount, setContractCount]     = useState(0)
  const [selectedBot, setSelectedBot]         = useState<Bot | null>(null)
  const [selectedLawyer, setSelectedLawyer]   = useState<Lawyer | null>(null)
  const [contractParams, setContractParams]   = useState<ContractParams>({ timeout: 30, penaltyRate: 20, useOracle: false })
  const [phase, setPhase]                     = useState<GameState['phase']>('select')
  const [showLoanModal, setShowLoanModal]     = useState(false)
  const [pendingLoanBot, setPendingLoanBot]   = useState<Bot | null>(null)

  // Persist on change
  useEffect(() => {
    savePersisted({ coins, trustScores, stats, capitalProtected, legalRisk })
  }, [coins, trustScores, stats, capitalProtected, legalRisk])

  const applyTrust = useCallback((botId: string, event: Parameters<typeof applyTrustUpdate>[2]) => {
    setTrustScores(prev => applyTrustUpdate(prev, botId, event))
  }, [])

  const addDominoBump = useCallback((amount: number) => {
    setDominoBumps(prev => prev + amount)
  }, [])

  const reduceDominoBump = useCallback(() => {
    setDominoBumps(prev => Math.max(0, prev - DOMINO_RECOVERY))
  }, [])

  const openLoanModal = useCallback((bot: Bot) => {
    setPendingLoanBot(bot)
    setShowLoanModal(true)
  }, [])

  const closeLoanModal = useCallback(() => {
    setShowLoanModal(false)
    setPendingLoanBot(null)
  }, [])

  const incrementContract = useCallback(() => {
    setContractCount(prev => prev + 1)
  }, [])

  const resetGame = useCallback(() => {
    setCoins(INITIAL_COINS)
    setTrustScores(initTrustScores())
    setStats(initStats())
    setCapProtected(0)
    setLegalRisk(0)
    setDominoBumps(0)
    setCrashActive(false)
    setContractCount(0)
    setSelectedBot(null)
    setSelectedLawyer(null)
    setContractParams({ timeout: 30, penaltyRate: 20, useOracle: false })
    setPhase('select')
    track('SESSION_START', { reset: true })
  }, [])

  return {
    coins, trustScores, stats, capitalProtected, legalRisk,
    dominoBumps, crashActive, contractCount,
    selectedBot, selectedLawyer, contractParams,
    phase, showLoanModal, pendingLoanBot,
    setCoins, setPhase, selectBot: setSelectedBot, selectLawyer: setSelectedLawyer,
    updateParams: (p) => setContractParams(prev => ({ ...prev, ...p })),
    applyTrust, addDominoBump, reduceDominoBump,
    setCrash: setCrashActive,
    openLoanModal, closeLoanModal, incrementContract, resetGame,
  }
}
```

- [ ] **Step 7: TypeScript kontrolü**

```bash
cd C:/Users/UmutCan/test-proje && npx tsc --noEmit 2>&1 | head -20
```

Hataları düzelt, ileri geçme.

- [ ] **Step 8: Tüm testleri çalıştır**

```bash
cd C:/Users/UmutCan/test-proje && npx vitest run 2>&1 | tail -10
```

- [ ] **Step 9: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/hooks/ src/test/hooks/
git commit -m "feat: add custom hooks (useGameState, useTimeTunnel, useCoinAnimation)"
```

---

## Task 6: Styles

**Files:**
- Create: `src/styles/global.css`

- [ ] **Step 1: src/styles/global.css oluştur**

v2_7.jsx'teki `GLOBAL_CSS` string sabitini (satır 376 civarı) bul, içeriğini olduğu gibi bu dosyaya kopyala. String tırnaklarını kaldır, plain CSS olsun:

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Barlow+Condensed:wght@400;600;700;800;900&family=Syne:wght@400;700;800;900&display=swap');
/* ... v2_7.jsx'teki GLOBAL_CSS içeriğinin tamamı buraya */
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/styles/global.css
git commit -m "feat: extract global CSS to src/styles/global.css"
```

---

## Task 7: UI Bileşenleri

**Files:**
- Create: `src/components/ui/Tooltip.tsx`
- Create: `src/components/ui/JudgeDialogue.tsx`
- Create: `src/components/ui/ConfettiOverlay.tsx`
- Create: `src/components/layout/CoinDisplay.tsx`
- Create: `src/components/layout/Header.tsx`

Bu task'ta v2_7.jsx'teki ilgili bileşenleri TypeScript prop türleriyle port et.

- [ ] **Step 1: src/components/ui/Tooltip.tsx oluştur**

v2_7.jsx'teki `Tooltip` / `LegalTermTooltip` bileşenini bul, port et:
```typescript
import type { LegalTerm } from '../../types'

interface TooltipProps {
  term: LegalTerm
  onExpand: (key: string) => void
  termKey: string
}

export function Tooltip({ term, onExpand, termKey }: TooltipProps) {
  // v2_7.jsx'teki implementasyonu buraya kopyala + TypeScript tipleri ekle
}
```

- [ ] **Step 2: src/components/ui/JudgeDialogue.tsx oluştur**

```typescript
interface JudgeDialogueProps {
  year: number
  winProb: number
  visible: boolean
}

export function JudgeDialogue({ year, winProb, visible }: JudgeDialogueProps) {
  // v2_7.jsx'teki Hakim Bey dialogue render mantığını buraya kopyala
}
```

- [ ] **Step 3: src/components/ui/ConfettiOverlay.tsx oluştur**

```typescript
interface ConfettiOverlayProps {
  active: boolean
  type: 'win' | 'loss' | null
}

export function ConfettiOverlay({ active, type }: ConfettiOverlayProps) {
  // v2_7.jsx'teki confetti + loss-flash render mantığını buraya çıkar
}
```

- [ ] **Step 4: src/components/layout/CoinDisplay.tsx oluştur**

`React.memo` ile sar:
```typescript
import { memo } from 'react'

interface CoinDisplayProps {
  coins: number
  delta: number
  isAnimating: boolean
}

export const CoinDisplay = memo(function CoinDisplay({ coins, delta, isAnimating }: CoinDisplayProps) {
  // v2_7.jsx'teki CoinDisplay implementasyonunu kopyala
})
```

- [ ] **Step 5: src/components/layout/Header.tsx oluştur**

```typescript
interface HeaderProps {
  coins: number
  reputation: number
  onReset: () => void
}

export function Header({ coins, reputation, onReset }: HeaderProps) {
  // v2_7.jsx'teki header render mantığını kopyala
}
```

- [ ] **Step 6: TypeScript kontrolü**

```bash
cd C:/Users/UmutCan/test-proje && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 7: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/components/ui/ src/components/layout/
git commit -m "feat: add UI and layout components with TypeScript props"
```

---

## Task 8: Game Bileşenleri

**Files:**
- Create: `src/components/game/BotCard.tsx`
- Create: `src/components/game/ContractBuilder.tsx`
- Create: `src/components/game/TimeTunnel.tsx`
- Create: `src/components/game/EconomicAutopsy.tsx`
- Create: `src/components/game/ResultModal.tsx`

- [ ] **Step 1: src/components/game/BotCard.tsx oluştur**

`React.memo` ile sar:
```typescript
import { memo } from 'react'
import type { Bot } from '../../types'

interface BotCardProps {
  bot: Bot
  trustScore: number
  isSelected: boolean
  onSelect: (bot: Bot) => void
}

export const BotCard = memo(function BotCard({ bot, trustScore, isSelected, onSelect }: BotCardProps) {
  // v2_7.jsx'teki BotCard implementasyonunu kopyala + TypeScript tipleri ekle
})
```

- [ ] **Step 2: src/components/game/ContractBuilder.tsx oluştur**

```typescript
import type { Bot, ContractParams } from '../../types'

interface ContractBuilderProps {
  bot: Bot
  params: ContractParams
  trustScore: number
  onParamsChange: (params: Partial<ContractParams>) => void
  onConfirm: (method: 'smart' | 'classic' | 'arbitration') => void
}

export function ContractBuilder({ bot, params, trustScore, onParamsChange, onConfirm }: ContractBuilderProps) {
  // v2_7.jsx'teki ContractBuilder implementasyonunu kopyala
}
```

- [ ] **Step 3: src/components/game/TimeTunnel.tsx oluştur**

```typescript
import type { YearEvent } from '../../types'

interface TimeTunnelProps {
  year: number
  totalYears: number
  currentEvent: string | null
  winProb: number
  onAdvance: () => void
  judgeDialogue: string
}

export function TimeTunnel({ year, totalYears, currentEvent, winProb, onAdvance, judgeDialogue }: TimeTunnelProps) {
  // v2_7.jsx'teki TimeTunnel implementasyonunu kopyala
}
```

- [ ] **Step 4: src/components/game/EconomicAutopsy.tsx oluştur**

`basePrice` prop'u ekle (v2.5 bug fix #2):
```typescript
import type { AutopsyResult } from '../../types'

interface EconomicAutopsyProps {
  result: AutopsyResult
  basePrice: number          // BUG FIX: v2.5 spec #2
  onReplay: () => void
  onNewContract: () => void
}

export function EconomicAutopsy({ result, basePrice, onReplay, onNewContract }: EconomicAutopsyProps) {
  // v2_7.jsx'teki EconomicAutopsy implementasyonunu kopyala
  // computeCourtFee(basePrice) kullan — inflationLoss değil
}
```

- [ ] **Step 5: src/components/game/ResultModal.tsx oluştur**

```typescript
interface ResultModalProps {
  won: boolean
  reward: number
  method: 'smart' | 'classic' | 'arbitration'
  onContinue: () => void
}

export function ResultModal({ won, reward, method, onContinue }: ResultModalProps) {
  // v2_7.jsx'teki ResultModal implementasyonunu kopyala
}
```

- [ ] **Step 6: TypeScript kontrolü**

```bash
cd C:/Users/UmutCan/test-proje && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 7: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/components/game/
git commit -m "feat: add game components with TypeScript props (BotCard, ContractBuilder, TimeTunnel, etc.)"
```

---

## Task 9: Modal Bileşenleri

**Files:**
- Create: `src/components/modals/BankruptcyModal.tsx`
- Create: `src/components/modals/LoanModal.tsx`
- Create: `src/components/modals/LegalTermModal.tsx`

- [ ] **Step 1: src/components/modals/BankruptcyModal.tsx oluştur**

```typescript
interface BankruptcyModalProps {
  coins: number
  onReset: () => void
}

export function BankruptcyModal({ coins, onReset }: BankruptcyModalProps) {
  // v2_7.jsx'teki insolvency modal implementasyonunu kopyala
}
```

- [ ] **Step 2: src/components/modals/LoanModal.tsx oluştur**

```typescript
import type { Bot } from '../../types'

interface LoanModalProps {
  bot: Bot
  playerCoins: number
  onAccept: () => void
  onDecline: () => void
}

export function LoanModal({ bot, playerCoins, onAccept, onDecline }: LoanModalProps) {
  // v2_7.jsx'teki loan modal implementasyonunu kopyala
}
```

- [ ] **Step 3: src/components/modals/LegalTermModal.tsx oluştur**

```typescript
import type { LegalTerm } from '../../types'

interface LegalTermModalProps {
  termKey: string
  term: LegalTerm
  onClose: () => void
}

export function LegalTermModal({ termKey, term, onClose }: LegalTermModalProps) {
  // v2_7.jsx'teki LegalTermModal implementasyonunu kopyala
}
```

- [ ] **Step 4: TypeScript kontrolü + tüm testler**

```bash
cd C:/Users/UmutCan/test-proje && npx tsc --noEmit && npx vitest run 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/components/modals/
git commit -m "feat: add modal components (bankruptcy, loan, legalTerm)"
```

---

## Task 10: App.tsx + main.tsx — Her Şeyi Bağla

**Files:**
- Create: `src/App.tsx`
- Create: `src/main.tsx`
- Modify: `index.html`

- [ ] **Step 1: src/main.tsx oluştur**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 2: src/App.tsx oluştur**

v2_7.jsx'teki ana `JusDigitalis` component'ini buraya port et, tüm hook ve bileşen import'larını kullanarak:

```typescript
import { useGameState } from './hooks/useGameState'
import { useTimeTunnel } from './hooks/useTimeTunnel'
import { useCoinAnimation } from './hooks/useCoinAnimation'
import { Header } from './components/layout/Header'
import { CoinDisplay } from './components/layout/CoinDisplay'
import { BotCard } from './components/game/BotCard'
import { ContractBuilder } from './components/game/ContractBuilder'
import { TimeTunnel } from './components/game/TimeTunnel'
import { EconomicAutopsy } from './components/game/EconomicAutopsy'
import { ResultModal } from './components/game/ResultModal'
import { BankruptcyModal } from './components/modals/BankruptcyModal'
import { LoanModal } from './components/modals/LoanModal'
import { LegalTermModal } from './components/modals/LegalTermModal'
import { ConfettiOverlay } from './components/ui/ConfettiOverlay'
import { JudgeDialogue } from './components/ui/JudgeDialogue'
import { BOTS } from './constants/bots'
import { BANKRUPTCY_THRESHOLD } from './constants/game'
import { track } from './utils/analytics'
import { computePlayerReputation } from './utils/trust'

// ErrorBoundary (v2_7.jsx'teki JusErrorBoundary'yi TypeScript class component olarak port et)
import { Component, type ReactNode } from 'react'
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(err: Error) { track('SIM_DATA', { type: 'ERROR', message: err.message }) }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: '#ff4444', padding: 40, textAlign: 'center' }}>
          <h2>Sistem Hatası</h2>
          <button onClick={() => { localStorage.clear(); window.location.reload() }}>
            Sıfırla ve Yeniden Başla
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export function App() {
  const game    = useGameState()
  const tunnel  = useTimeTunnel()
  const coinAnim = useCoinAnimation()
  const reputation = computePlayerReputation(game.trustScores)

  // v2_7.jsx'teki tüm game logic + render mantığını buraya port et
  // useGameState, useTimeTunnel, useCoinAnimation hook'larını kullan
  // Her modal, bileşen import edilmiş durumda

  return (
    <ErrorBoundary>
      {/* v2_7.jsx'teki JSX return içeriğini buraya kopyala, bileşenlere prop'ları ilet */}
    </ErrorBoundary>
  )
}
```

- [ ] **Step 3: index.html'i doğrula**

Mevcut `index.html`'de script src'nin `/src/main.tsx` olduğunu kontrol et. Değilse düzelt:
```html
<script type="module" src="/src/main.tsx"></script>
```

- [ ] **Step 4: Dev sunucusunu başlat ve test et**

```bash
cd C:/Users/UmutCan/test-proje && npm run dev
```

Tarayıcıda `http://localhost:5173` aç. Oyun v2_7.jsx ile birebir aynı görünmeli ve çalışmalı.

- [ ] **Step 5: Build al**

```bash
cd C:/Users/UmutCan/test-proje && npm run build 2>&1 | tail -10
```

Beklenen: `dist/` klasörü oluştu, hata yok.

- [ ] **Step 6: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/App.tsx src/main.tsx index.html
git commit -m "feat: wire up App.tsx with all hooks and components"
```

---

## Task 11: Temizlik — v2_7.jsx Kaldır

Bu task'ı YALNIZCA Task 10 sonunda uygulama tam çalışır durumda ise yap.

- [ ] **Step 1: Dev'de son kez doğrula**

```bash
cd C:/Users/UmutCan/test-proje && npm run dev
```

Tüm özellikler çalışıyor mu? Kontrol listesi:
- [ ] Bot seçimi açılıyor
- [ ] ContractBuilder slider'ları çalışıyor
- [ ] Smart contract akışı tamamlanıyor
- [ ] TimeTunnel yıl yıl ilerliyor
- [ ] EconomicAutopsy ekranı gösteriliyor
- [ ] localStorage persist çalışıyor (yenile, coins korunuyor)
- [ ] Bankrupt modal <100 coins'te açılıyor

- [ ] **Step 2: v2_7.jsx'i sil**

```bash
cd C:/Users/UmutCan/test-proje && rm v2_7.jsx
```

- [ ] **Step 3: Build al, hata olmadığını doğrula**

```bash
cd C:/Users/UmutCan/test-proje && npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Final commit**

```bash
cd C:/Users/UmutCan/test-proje
git add -A
git commit -m "chore: remove v2_7.jsx — TypeScript migration complete"
```

---

## Kontrol Listesi

- [ ] `npm run build` hata yok
- [ ] `npm run typecheck` hata yok
- [ ] `npm run test` tüm testler PASS
- [ ] Dev'de oyun v2_7.jsx ile birebir aynı davranıyor
- [ ] localStorage persist çalışıyor
- [ ] v2_7.jsx silindi
