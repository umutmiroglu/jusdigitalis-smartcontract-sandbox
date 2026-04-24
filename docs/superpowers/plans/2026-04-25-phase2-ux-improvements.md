# Phase 2 — UX İyileştirmeleri Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobil responsive layout eklemek, `useCoinAnimation` hook'unu App.tsx'e bağlamak, TimeTunnel'a hızlandır butonu ve `prefers-reduced-motion` desteği eklemek, ErrorBoundary'yi kayıp korumalı hale getirmek.

**Architecture:** Phase 1'in `src/` TypeScript yapısı üzerine inşa edilir. Hiçbir yeni sayfa/route eklenmez; mevcut bileşenler güçlendirilir. Tüm değişiklikler `feature/phase1-typescript-refactor` branch'inde devam eder.

**Tech Stack:** React 18, TypeScript 5, Vitest 4, inline React styles + `src/styles/global.css`

**Önkoşul:** Phase 1 tamamlanmış — branch `feature/phase1-typescript-refactor`, 42 test geçiyor, `npx tsc --noEmit` hatasız.

---

## Mevcut Kod Durumu (okumadan önce bil)

- `src/hooks/useCoinAnimation.ts` — Kuyruk tabanlı animasyon hook'u. **App.tsx bunu kullanmıyor**, inline duplikasyon var.
- `src/components/game/TimeTunnel.tsx` — Kendi state'ini yönetiyor, `setTimeout(5000)` ile otomatik yıl ilerliyor. **Manuel ilerleme butonu yok.**
- `src/hooks/useTimeTunnel.ts` — Ayrı bir hook; `TimeTunnel.tsx` bunu kullanmıyor. Bu Phase'de dokunulmayacak.
- `src/styles/global.css` — Temel stil dosyası; bileşenler inline style kullanıyor, bu yüzden breakpoint'ler için ayrıca bir React hook gerekiyor.
- `src/utils/persistence.ts` — `clearPersisted()` export edilmiş, ErrorBoundary tarafından kullanılacak.

---

## Task 1: useCoinAnimation — App.tsx'e Bağla

**Files:**
- Modify: `src/App.tsx:86-115` (inline animasyon mantığını sil, hook kullan)

- [ ] **Step 1: App.tsx'teki inline animasyonu useCoinAnimation ile değiştir**

`src/App.tsx`'te `FullSimulation` fonksiyonu içindeki şu satırları **sil**:
```typescript
// SİL:
const animQueueRef = useRef<number[]>([])
const animRunningRef = useRef(false)
const [coinAnim, setCoinAnim] = useState<{ amount: number; id: number } | null>(null)

function queueCoinAnim(amount: number) { animQueueRef.current.push(amount); drainAnimQueue() }
function drainAnimQueue() {
  if (animRunningRef.current || animQueueRef.current.length === 0) return
  animRunningRef.current = true
  const amount = animQueueRef.current.shift()!
  setCoinAnim({ amount, id: Date.now() })
  setTimeout(() => { setCoinAnim(null); animRunningRef.current = false; drainAnimQueue() }, 700)
}
```

Yerine ekle:
```typescript
import { useCoinAnimation } from './hooks/useCoinAnimation'

// FullSimulation içinde:
const { isAnimating: coinAnimating, currentDelta: coinDelta, queueAnimation: queueCoinAnim } = useCoinAnimation()
```

JSX'te coinAnim yerine şunu kullan:
```tsx
{coinAnimating && (
  <div style={{
    position: 'fixed', top: 80, right: 32,
    color: coinDelta > 0 ? '#00d4aa' : '#ff4444',
    fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 20,
    animation: 'fadeUp .7s ease-out forwards', pointerEvents: 'none', zIndex: 500,
  }}>
    {coinDelta > 0 ? '+' : ''}{coinDelta} JC
  </div>
)}
```

- [ ] **Step 2: TypeScript kontrolü**

```bash
cd C:/Users/UmutCan/test-proje && npx tsc --noEmit 2>&1
```

Beklenen: çıktı yok (0 hata).

- [ ] **Step 3: Testleri çalıştır**

```bash
cd C:/Users/UmutCan/test-proje && npx vitest run 2>&1 | tail -8
```

Beklenen: `42 passed`.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/App.tsx
git commit -m "refactor: replace inline coin animation with useCoinAnimation hook"
```

---

## Task 2: Mobile Responsive — useIsMobile Hook

Bileşenler inline style kullandığı için CSS breakpoint'leri tek başına yeterli değil. Küçük bir React hook ile çözülür.

**Files:**
- Create: `src/hooks/useIsMobile.ts`
- Modify: `src/App.tsx` (FullSimulation bot grid, choose_method grid)
- Modify: `src/components/game/ContractBuilder.tsx` (slider container)
- Modify: `src/styles/global.css` (input[range], modal global stilleri)

- [ ] **Step 1: useIsMobile hook yaz**

`src/hooks/useIsMobile.ts` oluştur:
```typescript
import { useState, useEffect } from 'react'

export function useIsMobile(breakpoint = 480): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])

  return isMobile
}
```

- [ ] **Step 2: FullSimulation'da bot grid'ini responsive yap**

`src/App.tsx` içinde `FullSimulation` bileşeninin başına ekle:
```typescript
const isMobile = useIsMobile()
```

`phase === 'select_bot'` return'ündeki bot listesi div'ini güncelle:
```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
```
Bu zaten `flexDirection: 'column'` — mobilde iyi görünüyor. İzle, değişiklik gerekmiyorsa atla.

`phase === 'choose_method'` içindeki method seçim grid'ini güncelle:
```tsx
// Eski:
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

// Yeni:
<div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
```

- [ ] **Step 3: ContractBuilder slider'larını mobilde büyüt**

`src/components/game/ContractBuilder.tsx`'e hook ekle ve slider wrapper'ını güncelle:

```typescript
import { useIsMobile } from '../../hooks/useIsMobile'

// ContractBuilder içinde:
const isMobile = useIsMobile()

// Her slider container'ına padding ekle:
<div style={{ padding: isMobile ? '12px 0' : '4px 0' }}>
  <input type="range" ... />
</div>
```

- [ ] **Step 4: global.css'e input[range] dokunmatik alan ekle**

`src/styles/global.css`'e ekle:
```css
/* ── Slider dokunmatik hedef alanı (mobil) ─────────────────── */
@media (max-width: 480px) {
  input[type=range] {
    padding: 16px 0;
    margin: -16px 0;
    cursor: pointer;
  }
}
```

- [ ] **Step 5: prefers-reduced-motion (global.css)**

`src/styles/global.css` sonuna ekle:
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 6: ConfettiOverlay'de JS animasyonu devre dışı bırak**

`src/components/ui/ConfettiOverlay.tsx`'in en üstüne ekle:
```typescript
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

Bileşenin render başında ekle:
```typescript
if (prefersReduced) {
  // Animasyon yerine hemen onDone tetikle, basit metin göster
  setTimeout(onDone, 100)
  return (
    <div style={{
      position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
      color: '#00d4aa', fontWeight: 700, fontSize: 18, zIndex: 1000,
      animation: 'none', pointerEvents: 'none',
    }}>
      ✓ Tebrikler!
    </div>
  )
}
```

- [ ] **Step 7: TypeScript kontrolü**

```bash
cd C:/Users/UmutCan/test-proje && npx tsc --noEmit 2>&1
```

Beklenen: çıktı yok.

- [ ] **Step 8: Testleri çalıştır**

```bash
cd C:/Users/UmutCan/test-proje && npx vitest run 2>&1 | tail -8
```

Beklenen: `42 passed`.

- [ ] **Step 9: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/hooks/useIsMobile.ts src/App.tsx src/components/game/ContractBuilder.tsx src/styles/global.css src/components/ui/ConfettiOverlay.tsx
git commit -m "feat: mobile responsive layout + prefers-reduced-motion support"
```

---

## Task 3: TimeTunnel — Hızlandır Butonu

TimeTunnel otomatik ilerliyor (her yıl 5000ms). Kullanıcı sabırsızsa beklemek zorunda kalıyor. Çözüm: "Hızlandır ⏩" butonu ile timer'ı erken tetikle.

**Files:**
- Modify: `src/components/game/TimeTunnel.tsx`

- [ ] **Step 1: Advance fonksiyonunu ref'e al**

`src/components/game/TimeTunnel.tsx`'te `TimeTunnel` bileşenine bir ref ekle:

```typescript
const skipRef = useRef<(() => void) | null>(null)
```

Mevcut `useEffect` (satır ~83–132 civarı) içindeki `timer = setTimeout(() => { ... }, 5000)` bloğunu şöyle yeniden yaz:

```typescript
useEffect(() => {
  if (done || currentYear >= maxYearsRef.current) return

  const doAdvance = () => {
    const evIdx = Math.min(currentYear, baseYearEvents.length - 1)
    const ev = baseYearEvents[evIdx] || { year: currentYear + 1, events: ['Dava devam ediyor...'], winProb: 0.5 }
    const courtText = pickRandom(ev.events)
    const judgeText = getJudgeDialogue(ev.year || currentYear + 1, ev.winProb)

    let complexityEvent: ComplexityEvent | null = null
    const cRoll = Math.random()
    if (lawyer.id === 'rookie' && cRoll < COMPLEXITY_EVENTS.rookie_miss.prob) {
      complexityEvent = COMPLEXITY_EVENTS.rookie_miss
      setMaxYears(m => { maxYearsRef.current = m + 1; return m + 1 })
    } else if (cRoll < COMPLEXITY_EVENTS.opp_delay.prob) {
      complexityEvent = COMPLEXITY_EVENTS.opp_delay
    } else if (cRoll < COMPLEXITY_EVENTS.opp_delay.prob + COMPLEXITY_EVENTS.witness_added.prob) {
      complexityEvent = COMPLEXITY_EVENTS.witness_added
    } else if (cRoll < COMPLEXITY_EVENTS.opp_delay.prob + COMPLEXITY_EVENTS.witness_added.prob + COMPLEXITY_EVENTS.doc_missing.prob) {
      complexityEvent = COMPLEXITY_EVENTS.doc_missing
    }

    let inflationEvent = null
    if (currentYear >= 1) {
      const oldLawyer   = lawyerFeeAt(currentYear - 1)
      const newLawyer   = lawyerFeeAt(currentYear)
      const oldCourt    = courtFeeAt(currentYear - 1)
      const newCourt    = courtFeeAt(currentYear)
      const oldBotPrice = botPriceAt(currentYear - 1)
      const newBotPrice = botPriceAt(currentYear)
      const delta = (newLawyer - oldLawyer) + (newCourt - oldCourt)
      inflCostRef.current += delta
      setTotalInflationCost(inflCostRef.current)
      inflationEvent = { year: currentYear + 1, calYear: LAWSUIT_START_YEAR + currentYear, oldLawyer, newLawyer, oldCourt, newCourt, oldBotPrice, newBotPrice, delta }
    }

    setLog(l => [...l, { year: currentYear + 1, courtText, judgeText, winProb: ev.winProb, complexityEvent, inflationEvent }])
    setCurrentYear(y => y + 1)
    skipRef.current = null
  }

  skipRef.current = doAdvance
  const timer = setTimeout(doAdvance, MS_PER_TUNNEL_YEAR)
  return () => { clearTimeout(timer); skipRef.current = null }
}, [currentYear, done])
```

> NOT: Bu değişiklik mevcut useEffect'in içeriğini bir fonksiyona (`doAdvance`) sarıyor — mantık aynı kalıyor. `lawyerFeeAt`, `courtFeeAt`, `botPriceAt` fonksiyonları aynı bileşende tanımlı.

- [ ] **Step 2: Hızlandır butonunu JSX'e ekle**

TimeTunnel JSX'inde ilerleme yüzdesi çubuğunun altında (done === false iken görünen bölümde) şunu ekle:

```tsx
{!done && currentYear < maxYears && (
  <button
    onClick={() => { if (skipRef.current) { skipRef.current(); } }}
    style={{
      marginTop: 8, padding: '6px 16px',
      background: 'rgba(255,255,255,.04)',
      border: '1px solid rgba(255,255,255,.1)',
      borderRadius: 8, color: '#4a5568',
      fontFamily: "'Syne',sans-serif", fontSize: 12,
      cursor: 'pointer',
    }}
  >
    Hızlandır ⏩
  </button>
)}
```

- [ ] **Step 3: TypeScript kontrolü**

```bash
cd C:/Users/UmutCan/test-proje && npx tsc --noEmit 2>&1
```

Beklenen: çıktı yok.

- [ ] **Step 4: Elle test et**

```bash
cd C:/Users/UmutCan/test-proje && npm run dev
```

Tarayıcıda: Klasik Sözleşme → Avukat seç → Dava yolu → TimeTunnel açılır → "Hızlandır ⏩" butonuna tıkla → yıl hemen ilerlemeli.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/components/game/TimeTunnel.tsx
git commit -m "feat: add skip button to TimeTunnel for impatient users"
```

---

## Task 4: Error Boundary — Kayıp Koruması

Hata olduğunda kullanıcının kaydettiği coin/istatistikler localStorage'da korunuyor. Şu anki ErrorBoundary her zaman "Sıfırla ve Yeniden Başla" diyor. Kaydedilmiş veri varsa "Kaldığın Yerden Devam Et" seçeneği sunulmalı.

**Files:**
- Modify: `src/App.tsx:32-47` (ErrorBoundary class'ı)

- [ ] **Step 1: ErrorBoundary'yi güçlendir**

`src/App.tsx`'teki `ErrorBoundary` class'ını (satır 32–47 civarı) şununla değiştir:

```typescript
import { loadPersisted, clearPersisted } from './utils/persistence'

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; canRecover: boolean }
> {
  state = { hasError: false, canRecover: false }

  static getDerivedStateFromError() {
    const saved = loadPersisted()
    return { hasError: true, canRecover: saved !== null }
  }

  componentDidCatch(err: Error) {
    track('SIM_DATA', { type: 'ERROR', message: err.message })
  }

  handleRecover = () => {
    this.setState({ hasError: false, canRecover: false })
  }

  handleReset = () => {
    clearPersisted()
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{
        color: '#e2e8f0', background: '#060a10', minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 16, padding: 40, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <h2 style={{ color: '#ff4444', fontFamily: "'Syne',sans-serif" }}>Sistem Hatası</h2>
        <p style={{ color: '#a0aec0', maxWidth: 320, lineHeight: 1.6 }}>
          Beklenmeyen bir hata oluştu.
        </p>
        {this.state.canRecover && (
          <button
            onClick={this.handleRecover}
            style={{
              background: 'linear-gradient(135deg,#00d4aa,#0099ff)', color: '#060a10',
              border: 'none', padding: '12px 28px', borderRadius: 8,
              cursor: 'pointer', fontWeight: 700, fontFamily: "'Syne',sans-serif", fontSize: 14,
            }}
          >
            Kaldığın Yerden Devam Et
          </button>
        )}
        <button
          onClick={this.handleReset}
          style={{
            background: 'transparent', color: '#718096',
            border: '1px solid rgba(255,255,255,.1)',
            padding: '10px 24px', borderRadius: 8,
            cursor: 'pointer', fontFamily: "'Syne',sans-serif", fontSize: 13,
          }}
        >
          Sıfırla ve Yeniden Başla
        </button>
      </div>
    )
  }
}
```

> NOT: `loadPersisted` ve `clearPersisted` `src/utils/persistence.ts`'te export edilmiş durumda.

- [ ] **Step 2: TypeScript kontrolü**

```bash
cd C:/Users/UmutCan/test-proje && npx tsc --noEmit 2>&1
```

Beklenen: çıktı yok.

- [ ] **Step 3: Tüm testleri çalıştır**

```bash
cd C:/Users/UmutCan/test-proje && npx vitest run 2>&1 | tail -8
```

Beklenen: `42 passed`.

- [ ] **Step 4: Production build**

```bash
cd C:/Users/UmutCan/test-proje && npm run build 2>&1 | tail -8
```

Beklenen: `✓ built in ...ms`, hata/uyarı yok.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/App.tsx
git commit -m "feat: error boundary with state recovery option"
```

---

## Kontrol Listesi (Tüm Task'lar Bitti mi?)

- [ ] `useCoinAnimation` hook'u App.tsx'te kullanılıyor, inline duplikasyon silindi
- [ ] 375px mobilde method seçim butonları alt alta diziliyor
- [ ] Slider'lar parmakla rahat kullanılabiliyor (16px dokunmatik padding)
- [ ] `prefers-reduced-motion` aktifken animasyonlar duruyor
- [ ] TimeTunnel'da "Hızlandır ⏩" butonu her yıl geçişinde görünüyor
- [ ] Hata durumunda kaydettiği veri varsa "Kaldığın Yerden Devam Et" butonu çıkıyor
- [ ] `npx tsc --noEmit` — 0 hata
- [ ] `npx vitest run` — 42 passed
- [ ] `npm run build` — uyarısız
