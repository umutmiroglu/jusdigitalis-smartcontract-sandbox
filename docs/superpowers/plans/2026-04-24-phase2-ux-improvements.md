# Phase 2 — UX İyileştirmeleri Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uygulamayı mobil responsive yapmak, animasyon hatalarını düzeltmek ve Error Boundary'yi kayıp korumalı hale getirmek.

**Architecture:** Faz 1'in `src/` yapısı üzerine inşa edilir. CSS değişiklikleri `src/styles/global.css`'e, mantık değişiklikleri ilgili hook/bileşene yapılır. Yeni bileşen eklenmez, mevcutlar güçlendirilir.

**Tech Stack:** React 18 (`useTransition`), CSS media queries, touch events

**Önkoşul:** Faz 1 tamamlanmış olmalı — `src/` yapısı ve TypeScript kurulumu mevcut.

---

## Task 1: Mobil Responsive CSS

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: Mevcut responsive durumu test et**

Dev sunucusunu başlat, tarayıcı DevTools'da mobil boyuta (375px) geç:
```bash
cd C:/Users/UmutCan/test-proje && npm run dev
```
Hangi elementler taşıyor/kırılıyor? Not al.

- [ ] **Step 2: CSS breakpoint'lerini ekle**

`src/styles/global.css` sonuna ekle:
```css
/* ── Tablet (≤ 768px) ─────────────────────────────────────── */
@media (max-width: 768px) {
  .bot-grid {
    grid-template-columns: 1fr 1fr;
  }
  .main-container {
    padding: 16px;
  }
  .time-tunnel {
    font-size: 14px;
  }
}

/* ── Mobile (≤ 480px) ─────────────────────────────────────── */
@media (max-width: 480px) {
  .bot-grid {
    grid-template-columns: 1fr;
  }
  .contract-builder {
    padding: 16px;
  }
  .modal-content {
    max-height: 90dvh;
    overflow-y: auto;
    border-radius: 12px 12px 0 0;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
  }
  .autopsy-panel {
    flex-direction: column;
  }
  .header-stats {
    font-size: 12px;
    gap: 8px;
  }
}
```

> NOT: Sınıf isimlerini v2_7.jsx'te kullanılan gerçek class adlarıyla eşleştir. Inline style kullanan bileşenler için `src/components/` altındaki ilgili dosyada style objesine medya query mantığı ekle (veya `window.innerWidth` yerine CSS tercih et).

- [ ] **Step 3: Slider dokunmatik hedef alanı büyüt**

`src/styles/global.css`'deki `input[type=range]` kuralını güncelle:
```css
input[type=range] {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: rgba(255,255,255,.1);
  width: 100%;
  cursor: pointer;
  /* Dokunmatik hedef alanı */
  padding: 20px 0;
  margin: -20px 0;
}
```

- [ ] **Step 4: Mobil'de test et**

DevTools'da 375px ve 768px'de her ekranı kontrol et:
- [ ] Bot kartları taşmıyor
- [ ] Modal'lar bottom sheet olarak açılıyor
- [ ] Slider'lar parmakla rahat kullanılıyor
- [ ] Header taşmıyor

- [ ] **Step 5: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/styles/global.css
git commit -m "feat: add mobile responsive CSS (480px, 768px breakpoints)"
```

---

## Task 2: TimeTunnel Dokunmatik Swipe

**Files:**
- Modify: `src/components/game/TimeTunnel.tsx`

- [ ] **Step 1: Swipe hook yaz**

`src/components/game/TimeTunnel.tsx` dosyasına ekle (component içinde kullan):
```typescript
function useSwipe(onSwipeLeft: () => void) {
  const touchStartX = useRef<number | null>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (diff > 50) onSwipeLeft() // 50px threshold
    touchStartX.current = null
  }, [onSwipeLeft])

  return { handleTouchStart, handleTouchEnd }
}
```

- [ ] **Step 2: TimeTunnel container'ına swipe handler'ları ekle**

`TimeTunnel.tsx`'teki return JSX'te:
```typescript
const { handleTouchStart, handleTouchEnd } = useSwipe(onAdvance)

return (
  <div
    onTouchStart={handleTouchStart}
    onTouchEnd={handleTouchEnd}
    // ... mevcut props
  >
    {/* mevcut içerik */}
  </div>
)
```

- [ ] **Step 3: Mobil swipe test et**

Dev sunucusunda mobil emülasyonda TimeTunnel ekranına gel, sola swipe yaparak ilerlemenin çalıştığını doğrula.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/components/game/TimeTunnel.tsx
git commit -m "feat: add swipe-to-advance in TimeTunnel for mobile"
```

---

## Task 3: useCoinAnimation — Animasyon Kuyruğu Bug Fix

Bu task v2.5 spec Bug #4'ü düzeltir. Faz 1'de `useCoinAnimation` zaten doğru implement edildiyse bu task'ı atla, sadece doğrulama yap.

**Files:**
- Modify: `src/hooks/useCoinAnimation.ts`

- [ ] **Step 1: Animasyon çakışma testini yaz**

`src/test/hooks/useCoinAnimation.test.ts`'e ekle:
```typescript
it('queuing two animations does not show both simultaneously', async () => {
  const { result } = renderHook(() => useCoinAnimation())
  act(() => {
    result.current.queueAnimation(100)
    result.current.queueAnimation(200)
  })
  // İlk animasyon çalışırken currentDelta sadece ilk değeri göstermeli
  expect(result.current.currentDelta).toBe(100)
})
```

- [ ] **Step 2: Testi çalıştır**

```bash
cd C:/Users/UmutCan/test-proje && npx vitest run src/test/hooks/useCoinAnimation.test.ts
```

PASS ise Task 3 tamamlandı. FAIL ise `useCoinAnimation.ts`'deki kuyruk mantığını gözden geçir — `runningRef.current` kontrolünün doğru çalıştığından emin ol.

- [ ] **Step 3: Commit (değişiklik varsa)**

```bash
cd C:/Users/UmutCan/test-proje
git add src/hooks/useCoinAnimation.ts src/test/hooks/useCoinAnimation.test.ts
git commit -m "fix: coin animation queue prevents simultaneous overlapping animations"
```

---

## Task 4: prefers-reduced-motion Desteği

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/components/ui/ConfettiOverlay.tsx`

- [ ] **Step 1: CSS animasyonlarını reduced-motion'da devre dışı bırak**

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

- [ ] **Step 2: ConfettiOverlay'de JS animasyonu koru**

`src/components/ui/ConfettiOverlay.tsx`'e ekle:
```typescript
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Confetti particle'ları oluşturma bloğunda:
if (prefersReduced) {
  // Confetti yerine basit metin mesajı göster
  return <div style={{ /* kazanma mesajı */ }}>✓ Kazandınız!</div>
}
```

- [ ] **Step 3: Test et**

DevTools > Rendering > "Emulate CSS media feature prefers-reduced-motion: reduce" aç. Animasyonlar durmalı, oyun çalışmaya devam etmeli.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/styles/global.css src/components/ui/ConfettiOverlay.tsx
git commit -m "feat: respect prefers-reduced-motion for accessibility"
```

---

## Task 5: TimeTunnel useTransition (Smooth Year Advance)

**Files:**
- Modify: `src/hooks/useTimeTunnel.ts`

- [ ] **Step 1: useTransition ekle**

`src/hooks/useTimeTunnel.ts`'te `advanceYear` fonksiyonunu `startTransition` ile sar:

```typescript
import { useState, useCallback, useTransition } from 'react'

// useTimeTunnel içinde:
const [isPending, startTransition] = useTransition()

const advanceYear = useCallback(() => {
  startTransition(() => {
    setCurrentYear(prev => {
      const next = prev + 1
      const ev = events[next - 1]
      if (ev) {
        setCurrentEvent(pickRandom(ev.events))
        setWinProb(ev.winProb)
      }
      return next
    })
  })
}, [events, startTransition])

// hook return'üne isPending ekle
return { ..., isPending, advanceYear }
```

- [ ] **Step 2: TimeTunnel.tsx'te isPending kullan**

`src/components/game/TimeTunnel.tsx`'te:
```typescript
// props'a isPending ekle
interface TimeTunnelProps {
  // ...
  isPending: boolean
}

// İlerleme butonu:
<button disabled={isPending} onClick={onAdvance}>
  {isPending ? 'Yükleniyor…' : 'Sonraki Yıl →'}
</button>
```

- [ ] **Step 3: Test et**

TimeTunnel'da yıl geçişleri ekran donmadan smooth ilerlediğini doğrula.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/hooks/useTimeTunnel.ts src/components/game/TimeTunnel.tsx
git commit -m "feat: use React 18 useTransition for smooth TimeTunnel year advance"
```

---

## Task 6: Error Boundary — State Recovery

**Files:**
- Modify: `src/App.tsx` (ErrorBoundary class'ı)

- [ ] **Step 1: ErrorBoundary'yi güçlendir**

`src/App.tsx`'teki `ErrorBoundary` class'ını şununla değiştir:
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
    // State mevcut — sadece ErrorBoundary'yi reset et
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
        <h2 style={{ color: '#ff4444' }}>Sistem Hatası</h2>
        <p style={{ color: '#a0aec0', maxWidth: 320 }}>
          Beklenmeyen bir hata oluştu.
        </p>
        {this.state.canRecover && (
          <button
            onClick={this.handleRecover}
            style={{
              background: '#00d4aa', color: '#060a10', border: 'none',
              padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
            }}
          >
            Kaldığın Yerden Devam Et
          </button>
        )}
        <button
          onClick={this.handleReset}
          style={{
            background: 'transparent', color: '#ff4444', border: '1px solid #ff4444',
            padding: '12px 24px', borderRadius: 8, cursor: 'pointer',
          }}
        >
          Sıfırla ve Yeniden Başla
        </button>
      </div>
    )
  }
}
```

- [ ] **Step 2: TypeScript kontrolü**

```bash
cd C:/Users/UmutCan/test-proje && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Tüm testleri çalıştır**

```bash
cd C:/Users/UmutCan/test-proje && npx vitest run 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/App.tsx
git commit -m "feat: error boundary with state recovery option"
```

---

## Kontrol Listesi

- [ ] 375px mobilde bot kartları taşmıyor
- [ ] Modal'lar mobilde bottom sheet olarak açılıyor
- [ ] Slider'lar parmakla kullanılabiliyor
- [ ] TimeTunnel'da sola swipe çalışıyor
- [ ] prefers-reduced-motion animasyonları durduruyor
- [ ] Hata durumunda "Kaldığın Yerden Devam Et" seçeneği çıkıyor
- [ ] `npm run build` hata yok
- [ ] `npm run test` tüm PASS
