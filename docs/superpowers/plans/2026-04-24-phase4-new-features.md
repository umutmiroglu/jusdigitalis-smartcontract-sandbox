# Phase 4 — Yeni Özellikler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `react-router-dom` ile routing eklemek; QUICK_DEMO (`/demo`), SCENARIO_MODE (`/scenarios`) ve COMPARISON_TOOL (`/compare`) modüllerini hayata geçirmek.

**Architecture:** Faz 1-3 yapısı üzerine inşa. Her yeni modül kendi route'unda, kendi bileşeninde. Mevcut `computeAutopsy`, `computeSuccessRate` ve diğer utils fonksiyonları yeniden kullanılır — sıfırdan iş yazılmaz. Her modül bağımsız deploy edilebilir.

**Tech Stack:** React 18, react-router-dom v6, mevcut TypeScript yapısı

**Önkoşul:** Faz 1-3 tamamlanmış olmalı.

---

## Task 1: React Router Kurulumu

**Files:**
- Modify: `package.json`
- Create: `src/constants/scenarios.ts`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: react-router-dom kur**

```bash
cd C:/Users/UmutCan/test-proje && npm install react-router-dom && npm install --save-dev @types/react-router-dom 2>&1 | tail -3
```

> NOT: react-router-dom v6'da `@types` gerekmiyor, paket built-in type içeriyor. İkinci komut 404 verirse atlayın.

- [ ] **Step 2: main.tsx'e BrowserRouter ekle**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/global.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 3: App.tsx'e Routes ekle**

`src/App.tsx`'i güncelle — mevcut oyun içeriği `FullSimulation` bileşenine taşınır:
```typescript
import { Routes, Route } from 'react-router-dom'
import { FullSimulation } from './pages/FullSimulation'
import { QuickDemo } from './pages/QuickDemo'
import { ScenarioMode } from './pages/ScenarioMode'
import { ComparisonTool } from './pages/ComparisonTool'

export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/"          element={<FullSimulation />} />
        <Route path="/demo"      element={<QuickDemo />} />
        <Route path="/scenarios" element={<ScenarioMode />} />
        <Route path="/compare"   element={<ComparisonTool />} />
      </Routes>
    </ErrorBoundary>
  )
}
```

> NOT: Mevcut App.tsx içeriği `src/pages/FullSimulation.tsx`'e taşı.

- [ ] **Step 4: src/pages/ klasörü oluştur ve FullSimulation taşı**

```bash
mkdir -p C:/Users/UmutCan/test-proje/src/pages
```

Mevcut `App.tsx`'in tüm oyun JSX/mantığını `src/pages/FullSimulation.tsx`'e kopyala:
```typescript
// src/pages/FullSimulation.tsx
import { useGameState } from '../hooks/useGameState'
import { useTimeTunnel } from '../hooks/useTimeTunnel'
import { useCoinAnimation } from '../hooks/useCoinAnimation'
// ... diğer importlar

export function FullSimulation() {
  // mevcut App.tsx içeriği buraya
}
```

- [ ] **Step 5: Header'a navigasyon ekle**

`src/components/layout/Header.tsx`'e:
```typescript
import { Link, useLocation } from 'react-router-dom'

// Mevcut Header'a nav linkleri ekle:
const NAV_LINKS = [
  { to: '/',          label: 'Simülasyon' },
  { to: '/demo',      label: 'Hızlı Demo' },
  { to: '/scenarios', label: 'Senaryolar' },
  { to: '/compare',   label: 'Karşılaştır' },
]

// JSX içinde:
<nav style={{ display: 'flex', gap: 16 }}>
  {NAV_LINKS.map(({ to, label }) => (
    <Link
      key={to}
      to={to}
      style={{
        color: location.pathname === to ? '#00d4aa' : '#718096',
        textDecoration: 'none', fontSize: 13, fontWeight: 600,
      }}
    >
      {label}
    </Link>
  ))}
</nav>
```

- [ ] **Step 6: Vite'a SPA fallback ekle**

`vite.config.ts` güncelle:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    historyApiFallback: true,
  },
})
```

- [ ] **Step 7: TypeScript kontrolü + dev test**

```bash
cd C:/Users/UmutCan/test-proje && npx tsc --noEmit && npm run dev
```

`http://localhost:5173` → oyun çalışıyor. `/demo`, `/scenarios`, `/compare` → henüz boş sayfalar (Task 2-4'te doldurulacak).

- [ ] **Step 8: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/main.tsx src/App.tsx src/pages/FullSimulation.tsx src/components/layout/Header.tsx vite.config.ts
git commit -m "feat: add react-router-dom with 4 routes (/, /demo, /scenarios, /compare)"
```

---

## Task 2: QUICK_DEMO (`/demo`)

**Files:**
- Create: `src/pages/QuickDemo.tsx`

- [ ] **Step 1: QuickDemo temel yapısını oluştur**

```typescript
// src/pages/QuickDemo.tsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { BOTS } from '../constants/bots'
import { computeSuccessRate, computeDynamicReward, computeAutopsy } from '../utils/math'
import { track } from '../utils/analytics'

// Demo sabit parametreleri
const DEMO_BOT    = BOTS.find(b => b.id === 'opportunist')!
const DEMO_PARAMS = { timeout: 15, penaltyRate: 10, useOracle: false }

type DemoPhase = 'intro' | 'running' | 'result'

interface DemoResult {
  classic: { won: boolean; reward: number; years: number }
  smart:   { won: boolean; reward: number }
}
```

- [ ] **Step 2: Demo simülasyon mantığı**

```typescript
function runDemoSimulation(): DemoResult {
  const crashActive = false
  // Classic yol — düşük başarı oranı
  const classicRate = computeClassicDirectRate(DEMO_BOT, crashActive)
  const classicWon  = Math.random() < classicRate
  const classicYears = classicWon ? 0 : Math.floor(Math.random() * 4) + 1
  const { reward: classicReward } = computeDynamicReward(DEMO_BOT, crashActive)

  // Smart contract yolu — yüksek başarı oranı
  const scRate = computeSuccessRate(DEMO_BOT, { ...DEMO_PARAMS, useOracle: true }, crashActive)
  const scWon  = Math.random() < scRate
  const { reward: scReward } = computeDynamicReward(DEMO_BOT, crashActive)

  return {
    classic: { won: classicWon, reward: classicWon ? classicReward : 0, years: classicYears },
    smart:   { won: scWon,      reward: scWon ? scReward : 0 },
  }
}
```

- [ ] **Step 3: QuickDemo component'in tamamı**

```typescript
export function QuickDemo() {
  const navigate = useNavigate()
  const [phase, setPhase]   = useState<DemoPhase>('intro')
  const [result, setResult] = useState<DemoResult | null>(null)
  const [progress, setProgress] = useState(0) // 0-100, animasyon için

  useEffect(() => {
    track('QUICK_DEMO_START', {})
  }, [])

  const startDemo = () => {
    setPhase('running')
    // 3 saniye animasyonlu "çalışıyor" gösterimi
    let p = 0
    const interval = setInterval(() => {
      p += 5
      setProgress(p)
      if (p >= 100) {
        clearInterval(interval)
        const r = runDemoSimulation()
        setResult(r)
        setPhase('result')
        track('QUICK_DEMO_COMPLETE', { classicWon: r.classic.won, scWon: r.smart.won })
      }
    }, 150)
  }

  if (phase === 'intro') {
    return (
      <div style={{ minHeight: '100vh', background: '#060a10', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24 }}>
        <div style={{ fontSize: 48 }}>⚡</div>
        <h1 style={{ color: '#e2e8f0', fontFamily: 'Syne, sans-serif', fontSize: 28, textAlign: 'center' }}>
          30 Saniyede Farkı Gör
        </h1>
        <p style={{ color: '#718096', maxWidth: 360, textAlign: 'center', lineHeight: 1.6 }}>
          Aynı anlaşma — klasik sözleşme ile Smart Contract. Hangisi daha iyi sonuç veriyor?
        </p>
        <div style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.3)', borderRadius: 8, padding: '12px 16px', color: '#ff6b35', fontSize: 13 }}>
          🦊 Karşı taraf: {DEMO_BOT.name} — {DEMO_BOT.title}
        </div>
        <button
          onClick={startDemo}
          style={{ background: '#00d4aa', color: '#060a10', border: 'none', padding: '14px 32px', borderRadius: 8, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
        >
          Demoyu Başlat
        </button>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'transparent', color: '#718096', border: 'none', cursor: 'pointer', fontSize: 13 }}
        >
          Detaylı Simülasyona Geç →
        </button>
      </div>
    )
  }

  if (phase === 'running') {
    return (
      <div style={{ minHeight: '100vh', background: '#060a10', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <div style={{ width: 280, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#00d4aa', transition: 'width 0.15s' }} />
        </div>
        <p style={{ color: '#718096', fontSize: 14 }}>Simülasyon çalışıyor…</p>
      </div>
    )
  }

  if (!result) return null

  const classicAutopsy = computeAutopsy('classic', DEMO_BOT, result.classic.years, result.classic.won)

  return (
    <div style={{ minHeight: '100vh', background: '#060a10', padding: 24 }}>
      <h2 style={{ color: '#e2e8f0', textAlign: 'center', marginBottom: 24 }}>Sonuçlar</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 600, margin: '0 auto' }}>
        {/* Klasik */}
        <div style={{ background: result.classic.won ? 'rgba(0,212,170,0.05)' : 'rgba(255,68,68,0.08)', border: `1px solid ${result.classic.won ? 'rgba(0,212,170,0.2)' : 'rgba(255,68,68,0.2)'}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, color: '#718096', fontWeight: 700, marginBottom: 8 }}>KLASİK SÖZLEŞME</div>
          <div style={{ fontSize: 24, marginBottom: 8 }}>{result.classic.won ? '✓' : '✗'}</div>
          <div style={{ fontSize: 16, color: result.classic.won ? '#00d4aa' : '#ff4444', fontWeight: 700 }}>
            {result.classic.won ? `+${result.classic.reward} JC` : `${result.classic.years} yıl dava`}
          </div>
          {!result.classic.won && (
            <div style={{ fontSize: 12, color: '#718096', marginTop: 8 }}>
              Toplam kayıp: {classicAutopsy.totalClassicLoss} JC
            </div>
          )}
        </div>
        {/* Smart */}
        <div style={{ background: 'rgba(0,212,170,0.05)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, color: '#718096', fontWeight: 700, marginBottom: 8 }}>SMART CONTRACT</div>
          <div style={{ fontSize: 24, marginBottom: 8 }}>{result.smart.won ? '✓' : '↩'}</div>
          <div style={{ fontSize: 16, color: '#00d4aa', fontWeight: 700 }}>
            {result.smart.won ? `+${result.smart.reward} JC` : 'İade edildi'}
          </div>
          <div style={{ fontSize: 12, color: '#718096', marginTop: 8 }}>
            {result.smart.won ? 'Anında teslim' : 'Sermaye korundu'}
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => { setPhase('intro'); setResult(null); setProgress(0) }}
          style={{ background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 24px', borderRadius: 8, cursor: 'pointer' }}
        >
          Tekrar Dene
        </button>
        <button
          onClick={() => navigate('/')}
          style={{ background: '#00d4aa', color: '#060a10', border: 'none', padding: '12px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
        >
          Detaylı Simülasyona Geç →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: computeClassicDirectRate import'unu kontrol et**

`QuickDemo.tsx` başına import ekle:
```typescript
import { computeSuccessRate, computeDynamicReward, computeAutopsy, computeClassicDirectRate } from '../utils/math'
```

- [ ] **Step 5: TypeScript kontrolü + dev test**

```bash
cd C:/Users/UmutCan/test-proje && npx tsc --noEmit 2>&1 | head -10
```

`http://localhost:5173/demo`'ya git, demoyu çalıştır.

- [ ] **Step 6: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/pages/QuickDemo.tsx
git commit -m "feat: QUICK_DEMO page at /demo — 30-second side-by-side simulation"
```

---

## Task 3: SCENARIO_MODE (`/scenarios`)

**Files:**
- Create: `src/constants/scenarios.ts`
- Create: `src/pages/ScenarioMode.tsx`

- [ ] **Step 1: src/constants/scenarios.ts oluştur**

```typescript
import type { BotId, ContractParams } from '../types'

export interface Scenario {
  id: string
  title: string
  subtitle: string
  emoji: string
  context: string
  learningGoal: string
  stat: string
  botId: BotId
  params: ContractParams
  forcedMethod?: 'classic' | null  // null = serbest seçim
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'import_crisis',
    title: 'İthalat Krizi 2024',
    subtitle: 'Döviz şoku + force majeure',
    emoji: '💸',
    context:
      'TL, 3 ayda %40 değer kaybetti. Tedarikçiniz fiyatları revize etmek istiyor. ' +
      'Klasik sözleşmede "piyasa koşulları" maddesi tartışmalı.',
    learningGoal: 'Döviz şokunda Smart Contract\'ın oracle entegrasyonu ile force majeure koşullarını nasıl otomatik yönettiğini görmek.',
    stat: '2024\'te döviz kaynaklı ticaret uyuşmazlıkları %34 arttı.',
    botId: 'opportunist',
    params: { timeout: 20, penaltyRate: 15, useOracle: true },
  },
  {
    id: 'software_delivery',
    title: 'Yazılım Projesi Teslimatı',
    subtitle: 'Milestone ispatlama güçlüğü',
    emoji: '💻',
    context:
      'Freelancer ile 6 aylık yazılım projesi sözleşmesi imzaladınız. ' +
      '3. milestone\'da "teslim ettim" diyor, siz göremiyorsunuz.',
    learningGoal: 'Yazılım teslimatlarında ispat yükünün klasik vs. Smart Contract\'ta nasıl farklılaştığını anlamak.',
    stat: 'Yazılım projelerinin %62\'si gecikmeli veya eksik teslim ediliyor.',
    botId: 'opportunist',
    params: { timeout: 30, penaltyRate: 25, useOracle: false },
  },
  {
    id: 'construction_delay',
    title: 'İnşaat Gecikme Davası',
    subtitle: '10 yıllık dava maliyeti',
    emoji: '🏗️',
    context:
      'Müteahhit 18 ay gecikti. "Belediye ruhsatı" bahanesi. ' +
      'Klasik sözleşme: mahkeme süreci başlıyor.',
    learningGoal: 'İnşaat sözleşmelerinde 10 yıllık dava maliyetinin enflasyon ve fırsat maliyetiyle nasıl katlandığını görmek.',
    stat: 'İnşaat davalarının ortalama süresi Türkiye\'de 7.3 yıl.',
    botId: 'contractor',
    params: { timeout: 45, penaltyRate: 30, useOracle: false },
    forcedMethod: 'classic',
  },
]
```

- [ ] **Step 2: src/pages/ScenarioMode.tsx oluştur**

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SCENARIOS, type Scenario } from '../constants/scenarios'
import { track } from '../utils/analytics'
import { BOTS } from '../constants/bots'

type ScenarioPhase = 'list' | 'context' | 'simulation' | 'summary'

export function ScenarioMode() {
  const navigate = useNavigate()
  const [phase, setPhase]               = useState<ScenarioPhase>('list')
  const [selected, setSelected]         = useState<Scenario | null>(null)

  const handleSelect = (scenario: Scenario) => {
    setSelected(scenario)
    setPhase('context')
    track('BOT_SELECT', { botId: scenario.botId, scenarioId: scenario.id })
  }

  const handleStartSimulation = () => {
    if (!selected) return
    // Seçili senaryoyla FullSimulation'a yönlendir (URL params ile)
    navigate(`/?scenario=${selected.id}`)
  }

  if (phase === 'list') {
    return (
      <div style={{ minHeight: '100vh', background: '#060a10', padding: 32 }}>
        <h1 style={{ color: '#e2e8f0', fontFamily: 'Syne, sans-serif', marginBottom: 8, textAlign: 'center' }}>
          Gerçek Vaka Senaryoları
        </h1>
        <p style={{ color: '#718096', textAlign: 'center', marginBottom: 32 }}>
          Gerçek hukuki durumları simüle edin.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, maxWidth: 900, margin: '0 auto' }}>
          {SCENARIOS.map(scenario => {
            const bot = BOTS.find(b => b.id === scenario.botId)!
            return (
              <button
                key={scenario.id}
                onClick={() => handleSelect(scenario)}
                style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12, padding: 24, cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>{scenario.emoji}</div>
                <div style={{ fontSize: 16, color: '#e2e8f0', fontWeight: 700, marginBottom: 4 }}>
                  {scenario.title}
                </div>
                <div style={{ fontSize: 12, color: '#718096', marginBottom: 12 }}>
                  {scenario.subtitle}
                </div>
                <div style={{ fontSize: 11, color: bot.color }}>
                  Karşı taraf: {bot.emoji} {bot.name}
                </div>
                <div style={{ fontSize: 11, color: '#4a5568', marginTop: 8, fontStyle: 'italic' }}>
                  {scenario.stat}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (phase === 'context' && selected) {
    return (
      <div style={{ minHeight: '100vh', background: '#060a10', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 24 }}>
        <div style={{ fontSize: 48 }}>{selected.emoji}</div>
        <h2 style={{ color: '#e2e8f0', textAlign: 'center' }}>{selected.title}</h2>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24, maxWidth: 480 }}>
          <p style={{ color: '#a0aec0', lineHeight: 1.7, marginBottom: 16 }}>{selected.context}</p>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
            <div style={{ fontSize: 11, color: '#00d4aa', fontWeight: 700, marginBottom: 4 }}>ÖĞRENME HEDEFİ</div>
            <p style={{ color: '#718096', fontSize: 13, lineHeight: 1.6 }}>{selected.learningGoal}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setPhase('list')}
            style={{ background: 'transparent', color: '#718096', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 20px', borderRadius: 8, cursor: 'pointer' }}
          >
            ← Geri
          </button>
          <button
            onClick={handleStartSimulation}
            style={{ background: '#00d4aa', color: '#060a10', border: 'none', padding: '12px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
          >
            Simülasyonu Başlat →
          </button>
        </div>
      </div>
    )
  }

  return null
}
```

- [ ] **Step 3: FullSimulation'da `?scenario=` param'ı oku**

`src/pages/FullSimulation.tsx`'te:
```typescript
import { useSearchParams } from 'react-router-dom'
import { SCENARIOS } from '../constants/scenarios'

// FullSimulation içinde:
const [searchParams] = useSearchParams()
const scenarioId = searchParams.get('scenario')
const activeScenario = scenarioId ? SCENARIOS.find(s => s.id === scenarioId) ?? null : null

// activeScenario varsa:
// - useGameState'e scenarioBot ve scenarioParams iletilebilir
// - forcedMethod varsa ContractBuilder'da yöntem kilitleme yapılır
// (Basit uygulama: useEffect ile activeScenario gelince game.selectBot + game.updateParams çağır)
```

- [ ] **Step 4: TypeScript kontrolü + dev test**

```bash
cd C:/Users/UmutCan/test-proje && npx tsc --noEmit 2>&1 | head -10
```

`http://localhost:5173/scenarios`'a git, senaryoları test et.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/constants/scenarios.ts src/pages/ScenarioMode.tsx src/pages/FullSimulation.tsx
git commit -m "feat: SCENARIO_MODE at /scenarios with 3 real-world scenarios"
```

---

## Task 4: COMPARISON_TOOL (`/compare`)

**Files:**
- Create: `src/pages/ComparisonTool.tsx`

- [ ] **Step 1: ComparisonTool bileşenini oluştur**

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { computeAutopsy, computeSuccessRate, computeClassicDirectRate } from '../utils/math'
import { BOTS } from '../constants/bots'
import { SmartCTA } from '../components/ui/SmartCTA'
import { useCTAState } from '../hooks/useCTAState'
import { track } from '../utils/analytics'

type CounterpartyRisk = 'low' | 'medium' | 'high'
type Jurisdiction = 'turkey' | 'international'

interface ComparisonInput {
  contractValue: number
  counterpartyRisk: CounterpartyRisk
  durationMonths: number
  jurisdiction: Jurisdiction
}

interface ComparisonResult {
  classic: {
    successRate: number
    expectedYears: number
    worstCaseLoss: number
    courtFee: number
  }
  smart: {
    successRate: number
    oracleFee: number
    protection: number
  }
  recommendation: 'smart' | 'classic' | 'neutral'
}

// Risk seviyesini bot ID'ye map et (hesaplamalar için)
const RISK_TO_BOT: Record<CounterpartyRisk, (typeof BOTS)[number]> = {
  low:    BOTS.find(b => b.id === 'honest')!,
  medium: BOTS.find(b => b.id === 'contractor')!,
  high:   BOTS.find(b => b.id === 'opportunist')!,
}

function computeComparison(input: ComparisonInput): ComparisonResult {
  const bot = RISK_TO_BOT[input.counterpartyRisk]
  const syntheticBot = { ...bot, basePrice: input.contractValue }
  const params = { timeout: 30, penaltyRate: 20, useOracle: false }

  const classicRate  = computeClassicDirectRate(syntheticBot, false)
  const scRate       = computeSuccessRate(syntheticBot, { ...params, useOracle: true }, false)

  const expectedYears = input.counterpartyRisk === 'high' ? 4
    : input.counterpartyRisk === 'medium' ? 7 : 3

  const autopsy = computeAutopsy('classic', syntheticBot, expectedYears, false)

  const recommendation: ComparisonResult['recommendation'] =
    input.counterpartyRisk === 'high' || (input.durationMonths > 12 && input.counterpartyRisk === 'medium')
      ? 'smart'
      : classicRate > 0.8 ? 'classic' : 'neutral'

  return {
    classic: {
      successRate: Math.round(classicRate * 100),
      expectedYears,
      worstCaseLoss: autopsy.totalClassicLoss,
      courtFee: autopsy.courtFee,
    },
    smart: {
      successRate: Math.round(scRate * 100),
      oracleFee: 30,
      protection: Math.round((1 - classicRate / scRate) * 100),
    },
    recommendation,
  }
}
```

- [ ] **Step 2: ComparisonTool JSX**

```typescript
export function ComparisonTool() {
  const navigate = useNavigate()
  const [input, setInput] = useState<ComparisonInput>({
    contractValue: 5000,
    counterpartyRisk: 'medium',
    durationMonths: 6,
    jurisdiction: 'turkey',
  })
  const [result, setResult] = useState<ComparisonResult | null>(null)

  const handleAnalyze = () => {
    const r = computeComparison(input)
    setResult(r)
    track('COMPARISON_VIEW', { ...input, recommendation: r.recommendation })
  }

  const cta = useCTAState({
    lastOutcome: result ? (result.recommendation === 'classic' ? 'classic_win' : 'sc_win') : null,
    scEverUsed: false,
    sessionCount: 1,
  })

  return (
    <div style={{ minHeight: '100vh', background: '#060a10', padding: 32 }}>
      <h1 style={{ color: '#e2e8f0', textAlign: 'center', marginBottom: 8 }}>Risk Analizi</h1>
      <p style={{ color: '#718096', textAlign: 'center', marginBottom: 32 }}>
        Sözleşme parametrelerinizi girin, klasik vs. Smart Contract karşılaştırması alın.
      </p>

      {/* Form */}
      <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={{ color: '#a0aec0', fontSize: 13 }}>
          Sözleşme Bedeli (JC)
          <input
            type="number"
            min={100} max={100000}
            value={input.contractValue}
            onChange={e => setInput(p => ({ ...p, contractValue: Number(e.target.value) }))}
            style={{ display: 'block', width: '100%', marginTop: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '10px 12px', color: '#e2e8f0', fontSize: 15 }}
          />
        </label>

        <label style={{ color: '#a0aec0', fontSize: 13 }}>
          Karşı Taraf Riski
          <select
            value={input.counterpartyRisk}
            onChange={e => setInput(p => ({ ...p, counterpartyRisk: e.target.value as CounterpartyRisk }))}
            style={{ display: 'block', width: '100%', marginTop: 6, background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '10px 12px', color: '#e2e8f0', fontSize: 15 }}
          >
            <option value="low">Düşük — Güvenilir Tüccar</option>
            <option value="medium">Orta — İnşaat / Proje</option>
            <option value="high">Yüksek — Bağımsız Ajan</option>
          </select>
        </label>

        <label style={{ color: '#a0aec0', fontSize: 13 }}>
          Süre (Ay): {input.durationMonths}
          <input
            type="range" min={1} max={36} value={input.durationMonths}
            onChange={e => setInput(p => ({ ...p, durationMonths: Number(e.target.value) }))}
            style={{ display: 'block', width: '100%', marginTop: 6 }}
          />
        </label>

        <label style={{ color: '#a0aec0', fontSize: 13 }}>
          Yargı Yeri
          <select
            value={input.jurisdiction}
            onChange={e => setInput(p => ({ ...p, jurisdiction: e.target.value as Jurisdiction }))}
            style={{ display: 'block', width: '100%', marginTop: 6, background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '10px 12px', color: '#e2e8f0', fontSize: 15 }}
          >
            <option value="turkey">Türkiye</option>
            <option value="international">Uluslararası</option>
          </select>
        </label>

        <button
          onClick={handleAnalyze}
          style={{ background: '#00d4aa', color: '#060a10', border: 'none', padding: '14px', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 8 }}
        >
          Analiz Et
        </button>
      </div>

      {/* Sonuç */}
      {result && (
        <div style={{ maxWidth: 600, margin: '32px auto 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {/* Klasik */}
            <div style={{ background: 'rgba(255,68,68,0.06)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 11, color: '#718096', fontWeight: 700, marginBottom: 12 }}>KLASİK SÖZLEŞME</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Row label="Başarı Olasılığı" value={`%${result.classic.successRate}`} />
                <Row label="Beklenen Dava" value={`${result.classic.expectedYears} yıl`} />
                <Row label="Mahkeme Harcı" value={`${result.classic.courtFee} JC`} color="#ff6b35" />
                <Row label="En Kötü Kayıp" value={`${result.classic.worstCaseLoss} JC`} color="#ff4444" />
              </div>
            </div>
            {/* Smart */}
            <div style={{ background: 'rgba(0,212,170,0.05)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 11, color: '#718096', fontWeight: 700, marginBottom: 12 }}>SMART CONTRACT</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Row label="Başarı Olasılığı" value={`%${result.smart.successRate}`} color="#00d4aa" />
                <Row label="Oracle Ücreti" value={`${result.smart.oracleFee} JC`} />
                <Row label="Risk Azaltma" value={`%${result.smart.protection}`} color="#00d4aa" />
                <Row label="Dava Süreci" value="Yok" color="#00d4aa" />
              </div>
            </div>
          </div>

          {/* Öneri */}
          <div style={{
            textAlign: 'center', padding: '16px 20px',
            background: result.recommendation === 'smart' ? 'rgba(0,212,170,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${result.recommendation === 'smart' ? 'rgba(0,212,170,0.2)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 12, marginBottom: 24,
          }}>
            <div style={{ fontSize: 12, color: '#718096', marginBottom: 4 }}>ÖNERİ</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: result.recommendation === 'smart' ? '#00d4aa' : '#e2e8f0' }}>
              {result.recommendation === 'smart' ? '⚡ Smart Contract Kullanın'
                : result.recommendation === 'classic' ? '✓ Klasik Sözleşme Yeterli'
                : '⚖️ Her iki seçenek değerlendirilebilir'}
            </div>
          </div>

          <SmartCTA cta={cta} />

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              onClick={() => navigate('/')}
              style={{ background: 'transparent', color: '#718096', border: 'none', cursor: 'pointer', fontSize: 13 }}
            >
              Simülasyonda dene →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, color = '#e2e8f0' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: '#718096' }}>{label}</span>
      <span style={{ color, fontWeight: 600 }}>{value}</span>
    </div>
  )
}
```

- [ ] **Step 3: TypeScript kontrolü + dev test**

```bash
cd C:/Users/UmutCan/test-proje && npx tsc --noEmit 2>&1 | head -10
```

`http://localhost:5173/compare`'ye git:
- [ ] Form input'ları çalışıyor
- [ ] "Analiz Et" tıklandığında sonuç tablosu gösteriliyor
- [ ] Öneri doğru şekilde değişiyor (yüksek risk → Smart Contract öner)
- [ ] SmartCTA sonuç ekranında görünüyor

- [ ] **Step 4: Commit**

```bash
cd C:/Users/UmutCan/test-proje
git add src/pages/ComparisonTool.tsx
git commit -m "feat: COMPARISON_TOOL at /compare — risk analysis with side-by-side output"
```

---

## Task 5: Final Build + Kontrol

- [ ] **Step 1: Tüm testleri çalıştır**

```bash
cd C:/Users/UmutCan/test-proje && npx vitest run 2>&1 | tail -10
```

Beklenen: Tüm testler PASS.

- [ ] **Step 2: TypeScript kontrolü**

```bash
cd C:/Users/UmutCan/test-proje && npx tsc --noEmit 2>&1 | head -10
```

Beklenen: Hata yok.

- [ ] **Step 3: Production build**

```bash
cd C:/Users/UmutCan/test-proje && npm run build 2>&1 | tail -10
```

Beklenen: `dist/` oluştu, hata yok.

- [ ] **Step 4: Manuel test — her route**

```bash
cd C:/Users/UmutCan/test-proje && npm run preview
```

- [ ] `/` → Oyun çalışıyor
- [ ] `/demo` → Demo başlıyor, sonuç gösteriliyor
- [ ] `/scenarios` → 3 senaryo listesi görünüyor, tıklanıyor
- [ ] `/compare` → Form çalışıyor, analiz sonucu çıkıyor
- [ ] Header nav linkleri doğru renkleniyor (aktif route)
- [ ] Mobil 375px'de tüm sayfalar kullanılabilir

- [ ] **Step 5: Final commit**

```bash
cd C:/Users/UmutCan/test-proje
git add -A
git commit -m "chore: Phase 4 complete — QUICK_DEMO, SCENARIO_MODE, COMPARISON_TOOL live"
```

---

## Kontrol Listesi

- [ ] `/demo` → Demo 30 saniyede tamamlanıyor, side-by-side sonuç gösteriyor
- [ ] `/scenarios` → 3 senaryo var, her biri FullSimulation'ı doğru parametrelerle başlatıyor
- [ ] `/compare` → Analiz formu çalışıyor, SmartCTA sonuçta görünüyor
- [ ] Header navigasyonu tüm rotalarda çalışıyor
- [ ] `npm run build` hata yok
- [ ] `npm run test` tüm PASS
