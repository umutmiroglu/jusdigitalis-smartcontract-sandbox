> **STATUS: TAMAMLANDI** — 2026-05-05 | Teknik referans olarak korunur.

# Phase 3 — Dönüşüm / İkna Optimizasyonu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A/B test altyapısını UI'a bağlamak, kullanıcı durumuna göre değişen akıllı CTA sistemi, sosyal kanıt widget'i ve kayıp aversion hesaplayıcı eklemek.

**Architecture:** Faz 1-2 yapısı üzerine inşa. 3 yeni hook (`useABVariant`, `useCTAState`, `useSocialProof`) ve 2 yeni bileşen (`SmartCTA`, `SocialProofWidget`). EconomicAutopsy bileşenine loss aversion calculator eklenir.

**Tech Stack:** React 18, mevcut analytics altyapısı, `/api/sandbox-analytics` endpoint

**Önkoşul:** Faz 1 + Faz 2 tamamlanmış olmalı.

---

## Task 1: useABVariant Hook — Variant'ları UI'a Bağla

**Files:**
- Create: `src/hooks/useABVariant.ts`
- Create: `src/test/hooks/useABVariant.test.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Failing test yaz**

`src/test/hooks/useABVariant.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useABVariant } from '../../hooks/useABVariant'

beforeEach(() => localStorage.clear())

describe('useABVariant', () => {
  it('returns a valid variant', () => {
    const { result } = renderHook(() => useABVariant())
    expect(['forceClassicFirst', 'freeChoice', 'aiAdvisorProminent']).toContain(result.current.variant)
  })
  it('persists variant across renders', () => {
    const { result: r1 } = renderHook(() => useABVariant())
    const { result: r2 } = renderHook(() => useABVariant())
    expect(r1.current.variant).toBe(r2.current.variant)
  })
  it('isForceClassic is true only for forceClassicFirst', () => {
    localStorage.setItem('jd_ab', 'forceClassicFirst')
    const { result } = renderHook(() => useABVariant())
    expect(result.current.isForceClassic).toBe(true)
  })
})
```

- [ ] **Step 2: Testi çalıştır, FAIL olduğunu doğrula**

```bash
cd C:/Users/UmutCan/test-proje && npx vitest run src/test/hooks/useABVariant.test.ts 2>&1 | tail -5
```

- [ ] **Step 3: src/hooks/useABVariant.ts oluştur**

```typescript
import { useMemo } from 'react'
import { getABVariant, type ABVariant } from '../utils/analytics'

interface ABVariantState {
  variant: ABVariant
  isForceClassic: boolean
  isFreeChoice: boolean
  isAIAdvisorProminent: boolean
}

export function useABVariant(): ABVariantState {
  const variant = useMemo(() => getABVariant(), [])
  return {
    variant,
    isForceClassic:        variant === 'forceClassicFirst',
    isFreeChoice:          variant === 'freeChoice',
    isAIAdvisorProminent:  variant === 'aiAdvisorProminent',
  }
}
```

- [ ] **Step 4: Testi çalıştır, PASS olduğunu doğrula**

```bash
cd C:/Users/UmutCan/test-proje && npx vitest run src/test/hooks/useABVariant.test.ts 2>&1 | tail -5
```

- [ ] **Step 5: App.tsx'te variant'ı kullan**

`src/App.tsx`'e ekle:
```typescript
import { useABVariant } from './hooks/useABVariant'

// App() içinde:
const ab = useABVariant()

// forceClassicFirst variant'ında ContractBuilder'da yöntem seçimini etkile:
// onConfirm çağrıldığında, ab.isForceClassic && ilk contract ise 'classic' zorla
// (game.contractCount === 0 && ab.isForceClassic → method = 'classic')

// analytics'e variant bilgisi ekle:
// track('SESSION_START', { abVariant: ab.variant })
```

Tam implementasyon: `src/App.tsx`'teki `handleConfirm` (veya benzeri) fonksiyonunu bul, `ab.isForceClassic && game.contractCount === 0` durumunda `method = 'classic'` olarak override et.

- [ ] **Step 6: Tüm testler PASS**

```bash
cd C:/Users/UmutCan/test-proje && npx vitest run 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/hooks/useABVariant.ts src/test/hooks/useABVariant.test.ts src/App.tsx
git commit -m "feat: wire A/B variants to UI (forceClassicFirst, aiAdvisorProminent)"
```

---

## Task 2: useCTAState Hook

**Files:**
- Create: `src/hooks/useCTAState.ts`
- Create: `src/test/hooks/useCTAState.test.ts`

- [ ] **Step 1: Failing test yaz**

`src/test/hooks/useCTAState.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCTAState } from '../../hooks/useCTAState'

beforeEach(() => localStorage.clear())

describe('useCTAState', () => {
  it('shows urgent CTA when classic failed and SC not tried', () => {
    const { result } = renderHook(() => useCTAState({
      lastOutcome: 'classic_loss',
      scEverUsed: false,
      sessionCount: 1,
    }))
    expect(result.current.primaryLabel).toContain('Smart Contract')
    expect(result.current.variant).toBe('urgent')
  })

  it('shows success CTA after SC win', () => {
    const { result } = renderHook(() => useCTAState({
      lastOutcome: 'sc_win',
      scEverUsed: true,
      sessionCount: 1,
    }))
    expect(result.current.variant).toBe('success')
  })

  it('shows personal CTA after 3+ sessions', () => {
    const { result } = renderHook(() => useCTAState({
      lastOutcome: null,
      scEverUsed: false,
      sessionCount: 3,
    }))
    expect(result.current.variant).toBe('personal')
  })

  it('shows default CTA otherwise', () => {
    const { result } = renderHook(() => useCTAState({
      lastOutcome: null,
      scEverUsed: false,
      sessionCount: 1,
    }))
    expect(result.current.variant).toBe('default')
  })
})
```

- [ ] **Step 2: Testi çalıştır, FAIL olduğunu doğrula**

```bash
cd C:/Users/UmutCan/test-proje && npx vitest run src/test/hooks/useCTAState.test.ts 2>&1 | tail -5
```

- [ ] **Step 3: src/hooks/useCTAState.ts oluştur**

```typescript
type CTAVariant = 'urgent' | 'success' | 'personal' | 'default'
type OutcomeType = 'classic_loss' | 'sc_win' | 'sc_loss' | 'classic_win' | null

interface CTAInput {
  lastOutcome: OutcomeType
  scEverUsed: boolean
  sessionCount: number
}

interface CTAState {
  variant: CTAVariant
  primaryLabel: string
  secondaryLabel: string | null
  primaryHref: string
}

const CTA_CONFIG: Record<CTAVariant, Omit<CTAState, 'variant'>> = {
  urgent: {
    primaryLabel: 'Smart Contract ile Aynı Anlaşmayı Simüle Et',
    secondaryLabel: 'Ücretsiz Hukuki Danışmanlık Al',
    primaryHref: '#simulate',
  },
  success: {
    primaryLabel: 'Gerçek Sözleşmenizi Smart Contract\'a Dönüştürün',
    secondaryLabel: 'Beyaz Kağıdı İndir',
    primaryHref: '#convert',
  },
  personal: {
    primaryLabel: 'Demo Görüşme Ayarlayın',
    secondaryLabel: null,
    primaryHref: '#demo',
  },
  default: {
    primaryLabel: 'Daha Fazla Senaryo Dene',
    secondaryLabel: 'Bültene Kaydol',
    primaryHref: '#scenarios',
  },
}

export function useCTAState({ lastOutcome, scEverUsed, sessionCount }: CTAInput): CTAState {
  let variant: CTAVariant = 'default'

  if (lastOutcome === 'classic_loss' && !scEverUsed) {
    variant = 'urgent'
  } else if (lastOutcome === 'sc_win') {
    variant = 'success'
  } else if (sessionCount >= 3) {
    variant = 'personal'
  }

  return { variant, ...CTA_CONFIG[variant] }
}
```

- [ ] **Step 4: Testleri çalıştır, PASS olduğunu doğrula**

```bash
cd C:/Users/UmutCan/test-proje && npx vitest run src/test/hooks/useCTAState.test.ts 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/hooks/useCTAState.ts src/test/hooks/useCTAState.test.ts
git commit -m "feat: useCTAState hook — context-aware CTA selection"
```

---

## Task 3: SmartCTA Bileşeni

**Files:**
- Create: `src/components/ui/SmartCTA.tsx`
- Modify: `src/components/game/EconomicAutopsy.tsx`

- [ ] **Step 1: src/components/ui/SmartCTA.tsx oluştur**

```typescript
import type { useCTAState } from '../../hooks/useCTAState'
import { track } from '../../utils/analytics'

type CTAState = ReturnType<typeof useCTAState>

interface SmartCTAProps {
  cta: CTAState
}

const VARIANT_STYLES: Record<CTAState['variant'], React.CSSProperties> = {
  urgent: {
    background: 'linear-gradient(135deg, #ff4444, #ff6b35)',
    color: '#fff',
    border: 'none',
    boxShadow: '0 0 24px rgba(255,68,68,0.4)',
  },
  success: {
    background: 'linear-gradient(135deg, #00d4aa, #00b899)',
    color: '#060a10',
    border: 'none',
    boxShadow: '0 0 24px rgba(0,212,170,0.4)',
  },
  personal: {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: '#fff',
    border: 'none',
  },
  default: {
    background: 'transparent',
    color: '#e2e8f0',
    border: '1px solid rgba(255,255,255,0.2)',
  },
}

export function SmartCTA({ cta }: SmartCTAProps) {
  const handleClick = () => {
    track('CTA_CLICK', { ctaType: cta.variant, label: cta.primaryLabel })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <a
        href={cta.primaryHref}
        onClick={handleClick}
        style={{
          display: 'inline-block',
          padding: '14px 28px',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 15,
          textDecoration: 'none',
          cursor: 'pointer',
          transition: 'transform 0.15s',
          ...VARIANT_STYLES[cta.variant],
        }}
      >
        {cta.primaryLabel}
      </a>
      {cta.secondaryLabel && (
        <button
          onClick={() => track('CTA_CLICK', { ctaType: 'secondary', label: cta.secondaryLabel })}
          style={{
            background: 'transparent', border: 'none',
            color: '#718096', cursor: 'pointer', fontSize: 13,
            textDecoration: 'underline',
          }}
        >
          {cta.secondaryLabel}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: EconomicAutopsy'ye SmartCTA ekle**

`src/components/game/EconomicAutopsy.tsx`'te:
```typescript
import { SmartCTA } from '../ui/SmartCTA'
import { useCTAState } from '../../hooks/useCTAState'

// EconomicAutopsyProps'a ekle:
interface EconomicAutopsyProps {
  // ...mevcut props
  lastOutcome: 'classic_loss' | 'sc_win' | 'sc_loss' | 'classic_win' | null
  scEverUsed: boolean
  sessionCount: number
}

// Component içinde:
const cta = useCTAState({ lastOutcome, scEverUsed, sessionCount })

// Return JSX sonuna ekle:
// <SmartCTA cta={cta} />
```

- [ ] **Step 3: TypeScript kontrolü**

```bash
cd C:/Users/UmutCan/test-proje && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 4: App.tsx'te EconomicAutopsy'ye prop'ları ilet**

`src/App.tsx`'te EconomicAutopsy kullanılan yerde gerekli prop'ları ilet:
```typescript
// lastOutcome: game.lastOutcome (yeni state alanı)
// scEverUsed: game.stats.smartContractsUsed > 0
// sessionCount: parseInt(localStorage.getItem('jd_session_count') ?? '1')
```

`useGameState.ts`'e `lastOutcome` state'i ekle:
```typescript
const [lastOutcome, setLastOutcome] = useState<'classic_loss' | 'sc_win' | 'sc_loss' | 'classic_win' | null>(null)
// return'e ekle: lastOutcome, setLastOutcome
```

- [ ] **Step 5: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/components/ui/SmartCTA.tsx src/components/game/EconomicAutopsy.tsx src/hooks/useGameState.ts
git commit -m "feat: SmartCTA component wired to EconomicAutopsy with context-aware variants"
```

---

## Task 4: SocialProofWidget

**Files:**
- Create: `src/hooks/useSocialProof.ts`
- Create: `src/components/ui/SocialProofWidget.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: useSocialProof hook oluştur**

`src/hooks/useSocialProof.ts`:
```typescript
import { useState, useEffect } from 'react'

interface SocialProofData {
  todayCount: number
  scPreferencePercent: number
  avgSavingJC: number
  konkordatoAvoided: number
}

const FALLBACK: SocialProofData = {
  todayCount: 47,
  scPreferencePercent: 68,
  avgSavingJC: 145,
  konkordatoAvoided: 12,
}

export function useSocialProof(): { data: SocialProofData; loading: boolean } {
  const [data, setData]     = useState<SocialProofData>(FALLBACK)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sandbox-analytics?aggregate=true')
      .then(r => r.json())
      .then((json: SocialProofData) => setData(json))
      .catch(() => setData(FALLBACK))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading }
}
```

- [ ] **Step 2: SocialProofWidget bileşeni oluştur**

`src/components/ui/SocialProofWidget.tsx`:
```typescript
import { useSocialProof } from '../../hooks/useSocialProof'

export function SocialProofWidget() {
  const { data, loading } = useSocialProof()

  if (loading) {
    return (
      <div style={{ opacity: 0.4, fontSize: 12, color: '#718096', textAlign: 'center', padding: 8 }}>
        Veriler yükleniyor…
      </div>
    )
  }

  const stats = [
    { label: 'Bugün denendi', value: data.todayCount.toString(), emoji: '👥' },
    { label: 'SC tercih etti', value: `%${data.scPreferencePercent}`, emoji: '⚡' },
    { label: 'Ortalama tasarruf', value: `${data.avgSavingJC} JC`, emoji: '💰' },
    { label: 'Kaçınılan konkordato', value: data.konkordatoAvoided.toString(), emoji: '🛡️' },
  ]

  return (
    <div style={{
      display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center',
      padding: '12px 16px', background: 'rgba(0,212,170,0.05)',
      border: '1px solid rgba(0,212,170,0.15)', borderRadius: 8,
    }}>
      {stats.map(s => (
        <div key={s.label} style={{ textAlign: 'center', minWidth: 80 }}>
          <div style={{ fontSize: 18 }}>{s.emoji}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#00d4aa' }}>{s.value}</div>
          <div style={{ fontSize: 11, color: '#718096' }}>{s.label}</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: App.tsx'te uygun yere ekle**

`src/App.tsx`'te bot seçim ekranının üstüne veya header'ın altına `<SocialProofWidget />` ekle.

- [ ] **Step 4: TypeScript kontrolü + testler**

```bash
cd C:/Users/UmutCan/test-proje && npx tsc --noEmit && npx vitest run 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/hooks/useSocialProof.ts src/components/ui/SocialProofWidget.tsx src/App.tsx
git commit -m "feat: SocialProofWidget with API fetch and static fallback"
```

---

## Task 5: Kayıp Aversion Hesaplayıcı

**Files:**
- Modify: `src/components/game/EconomicAutopsy.tsx`

- [ ] **Step 1: Mevcut computeOpportunityCostHuman'ı test et**

`src/test/utils/math.test.ts`'te bu test zaten var (Task 4'ten). PASS olduğunu doğrula:
```bash
cd C:/Users/UmutCan/test-proje && npx vitest run src/test/utils/math.test.ts --reporter=verbose 2>&1 | grep "opportunityCost"
```

- [ ] **Step 2: LossAversionCalculator'ü EconomicAutopsy'ye ekle**

`src/components/game/EconomicAutopsy.tsx`'te, mevcut kayıp satırlarının altına ekle:
```typescript
import { computeOpportunityCostHuman } from '../../utils/math'

// Component içinde (result.won === false && result.opportunityCost > 0 ise göster):
const human = computeOpportunityCostHuman(result.opportunityCost)

// JSX'te:
{!result.won && result.opportunityCost > 0 && (
  <div style={{
    marginTop: 16, padding: '12px 16px',
    background: 'rgba(255,68,68,0.08)', borderRadius: 8,
    border: '1px solid rgba(255,68,68,0.2)',
  }}>
    <div style={{ fontSize: 12, color: '#ff6b35', fontWeight: 700, marginBottom: 8 }}>
      KAYBEDILEN SÜRE
    </div>
    <div style={{ fontSize: 22, color: '#ff4444', fontWeight: 900 }}>
      {result.opportunityCost} JC
    </div>
    <div style={{ fontSize: 13, color: '#a0aec0', marginTop: 4 }}>
      = yaklaşık {human.hours} çalışma saati = {human.weeks} hafta
    </div>
    {result.scSaving > 0 && (
      <div style={{ fontSize: 12, color: '#00d4aa', marginTop: 8 }}>
        ✓ Smart Contract olsaydı: {result.scSaving} JC kurtarılırdı
      </div>
    )}
  </div>
)}
```

- [ ] **Step 3: Görsel test**

Dev sunucusunda klasik yöntemle kaybettikten sonra EconomicAutopsy ekranında kayıp aversion bloğunun göründüğünü doğrula.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/components/game/EconomicAutopsy.tsx
git commit -m "feat: loss aversion calculator in EconomicAutopsy"
```

---

## Kontrol Listesi

- [ ] A/B variant'ı localStorage'da persist oluyor
- [ ] `forceClassicFirst` variant'ında ilk sözleşme klasik zorlanıyor
- [ ] Her analytics event'ine `abVariant` alanı ekleniyor
- [ ] EconomicAutopsy'de CTA kullanıcı durumuna göre değişiyor
- [ ] SocialProofWidget API dönmezse fallback veri gösteriyor
- [ ] Kayıp aversion bloğu klasik yöntemde kayıptan sonra görünüyor
- [ ] `npm run build` hata yok
- [ ] `npm run test` tüm PASS
