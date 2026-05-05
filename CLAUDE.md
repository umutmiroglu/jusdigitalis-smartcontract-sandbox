# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Proje Kimliği

Bu proje bir hukuk-teknoloji politika sandboxidir.
Teknik bir ürün oldugu kadar bir arastirma araci ve politika ikna aracidir.

**Amac (3 katman):**
1. Egitim / kaniksamasimulasyonu — kullanici kosullu otomatik ifa mantigini oynarken ogrenir
2. Davranissal veri toplama — kullanicilar gercekten kosullu ifa secer mi, hangi sozlesme tiplerinde?
3. Politika ikna belgesi — 2027 baharinda HSK Yuksek Musaviri gorusmesi icin evidence-based zemin

**Cerceveleme:**
- "Smart contract iyi, klasik yol kotu" degil
- "Belirli sozlesme tiplerinde kosullu otomatik ifa, yargi yukunu azaltabilir"

---

## YASAKLI TERMINOLOJI (KESIN KURAL)

Asagidaki kelimeler bu projede HICBIR YERDE kullanilamaz —
ne kod yorumunda, ne UI metninde, ne dokumantasyonda:

- smart contract
- blockchain
- kripto / crypto
- web3
- oracle
- token
- distributed ledger

**Bunlarin yerine kullanilacak terimler:**
- "kosullu otomatik ifa sozlesmesi"
- "dogrulama mekanizmasi"
- "dijital icra altyapisi"
- "kosul-tetikli odeme sistemi"

Bu kural politiktir. Turkiye'de regulatorler bu kelimelere karsi hassastir.
Tek bir kelime musavirin konuyu kapatmasina yetebilir.

---

## Hedef Kitle

Davranissal veri kaynagi olarak uc grup:
1. **Tacirler** — bugunun acisini yasayanlar, zincirleme iflas riski tasiyanllar
2. **Tacir adaylari (ogrenciler)** — yarinin tacirleri, ogrenme motivasyonu yuksek
3. **Tuketiciler** — ticari zincirin son halkasi

Nihai alici: HSK Yuksek Musaviri (politika yapici)
Akademik mesrulastirici: Ankara Universitesi Hukuk Fakultesi ogretim uyesi (es yazar hedefi)

---

## Mimari Oncelikler

### Cascade Simulasyonu (En kritik eksik)
- Sozlesmeler izole degil, birbirine bagiimli calismali
- Kerem batarsa -> Mehmet'in durumu degismeli
- Aktorler arasi odeme grafi (payment dependency graph) gerekli
- Zincirleme iflas etkisi gorulur olmali

### Paralel + Zamana Yayilmis Yapi
- Turn-based degil, ayni anda birden cok sozlesme ilerliyor
- Zaman tuneli altyapisi mevcut — sozlesmeler bu eksende paylasilacak
- RichMan benzeri: ayni takvimde birden fazla aktor

### Adil Gosterim (Olcum aleti olma sarti)
- Kosullu otomatik ifa secenegine de dezavantajlar eklenecek:
  dogrulama ucreti, hatali kondisyon riski, gecikme riski
- "Klasik yol her zaman kaybeder" degil — adil simulasyon

---

## Veri Metodolojisi Kisitlari

- Orneklem secimi bilinoli yapilmali
- Kontrol grubu gerekli
- Niyet-davranis ayrimi olculumeli
- Etik kurul onayi surecinde olunmali (AU uzerinden)

**Altin kural:** Curuk veriyle gitmek hic gitmemekten kotudur.

---

## Teknik Kisitlar

- Yeni prototip yazilmayacak — bu codebase genisletilecek
- Mobil uygulama Asama 2'nin sonuna ertelendi
- Her buyuk mimari degisiklik sonrasi 3-5 kisilik kullanici testi zorunlu
- "Anlamadim" cikarsa geri cekil, basitlEstir — ship etme

---

## Gelistirme Asamalari

**Asama 1 (Ay 1-3) — Refactor:** Terminoloji + karakter diyalogla + sonuc ekrani dili
**Asama 2 (Ay 4-9) — Mimari:** Cascade + paralel sozlesmeler + dependency graph
**Asama 3 (Ay 10-15) — Kalibrasyon:** TUIK/Adalet Bakanligi verileri + analitik + etik kurul
**Asama 4 (Ay 16-21) — Demo:** 10-15 dk. sunum akisi + prova
**Asama 5 (Ay 22-24) — Gorusme:** HSK Musaviri, "AU arastirmasi" cercevesiyle

Deadline: 2027 Bahari

---

## Disiplin Kurallari (Claude Code'a not)

Bu projeye her katki yapilirken su sorular sorulmali:

1. Bu degisiklik yasakli terminoloji iceriyor mu?
2. Bu ozellik mevcut sandboxa eklenebilir mi, yoksa yeniden yazim mi gerektiriyor?
   (Yeniden yazim refleksine karsi dur — her seferinde "mevcut koda ekle" once dene)
3. Bu degisiklik cascade / paralel yapiyla uyumlu mu?
4. Kullanici testi yapilmadan buyuk UI degisikligi gonderilmedi mi?

---

## Commands

```bash
npm run dev          # Dev server (Vite HMR)
npm run build        # tsc + Vite bundle → dist/
npm run preview      # Serve production build locally
npm run test         # Vitest watch mode
npm run test:coverage # Coverage report
npm run typecheck    # tsc --noEmit (strict)
```

Run a single test file: `npx vitest run src/test/utils/math.test.ts`

---

## Architecture

### Stack

React 18 + TypeScript (strict), Vite, React Router v7, Vitest. No UI component library — all styling is inline CSS objects. No global state library (Redux/Zustand) — single custom hook (`useGameState`) owns all game state.

### Routing (`src/App.tsx`)

| Route | Page | Purpose |
|-------|------|---------|
| `/` | `GamePage.tsx` | Full simulation game loop |
| `/demo` | `QuickDemo.tsx` | 30-second automated comparison |
| `/scenarios` | `ScenarioMode.tsx` | Pre-built scenario picker |
| `/compare` | `ComparisonTool.tsx` | Side-by-side risk calculator |

`App.tsx` wraps everything in an `ErrorBoundary` that can recover from localStorage or full reset.

### Game State (`src/hooks/useGameState.ts`)

Central hook (~40 state vars). Partitioned into:
- **Persistent** (auto-saved to localStorage key `jus_digitalis_v27`): `coins`, `trustScores`, `stats`, `capitalProtected`, `legalRisk`
- **Session**: `phase` (10-step enum drives the full render tree), `selectedBot`, `chosenMethod`, `outcome`, `autopsy`
- **Modals**: `showInsolvency`, `pendingLoanRequest`, `activeLoan`, `showMiniLawsuit`, `showConsent`

`GamePage.tsx` is the orchestrator — it reads `phase` and renders the appropriate game component. All phase transitions happen through `setPhase()`.

### Phase Flow

```
select_bot → sc_architect → choose_method
  ├─ smart contract path: sc_executing → sc_result → autopsy
  └─ classic path: classic_shipping → lawyer_select → time_tunnel → classic_result → autopsy
```

### Core Calculation Pipeline (`src/utils/math.ts`)

- `computeSuccessRate()` — bot baseline ± oracle bonus ± domino bump ± crash penalty ± event effects
- `computeClassicDirectRate()` — lower base rate (50–75% of SC rate)
- `computeAutopsy()` — court fee (5%), inflation loss, opportunity cost (18%/yr), konkordato risk (15%)
- `priceAtSimYear()` — inflation adjustment using `INFLATION_BY_YEAR` table

### Trust & Reputation (`src/utils/trust.ts`)

Bots start at 50/100. `applyTrustUpdate()` applies deltas per outcome. `botEvaluateContract()` combines trust + contract harshness → accept / refuse / upcharge. Max discount: 20 JC (`TRUST_DISCOUNT_MAX`).

### Analytics (`src/utils/analytics.ts`)

Events batch-queued → POST `/api/sandbox-analytics` (Vercel serverless). Failed requests go to localStorage queue and retry on next flush. A/B variant (`forceClassicFirst` | `freeChoice` | `aiAdvisorProminent`) assigned once and persisted.

### Constants (`src/constants/`)

All game rules live here — never hardcode numbers in components:
- `game.ts` — fees, rates, thresholds, inflation table
- `bots.ts` — 3 bot profiles (honest/opportunist/contractor)
- `lawyers.ts` — 3 lawyer tiers
- `scenarios.ts` — 3 pre-built scenario configs
- `events.ts` — random TimeTunnel events
- `judge.ts` — judge dialogue lines

### Key Patterns

- **Phase-driven rendering:** `GamePage` switches on `phase` — adding a new game step means adding a phase value and a render case.
- **Animation queue:** `useCoinAnimation` serializes coin change animations to prevent race conditions.
- **Offline-first analytics:** queue + retry; never blocks game flow.
- **Domino effect:** `dominoBump` state reduces success rate by `DOMINO_FAILURE_BUMP` (0.20) per prior failure, recovers by `DOMINO_RECOVERY` (0.05) per SC success — this is the seed of future cascade simulation.
