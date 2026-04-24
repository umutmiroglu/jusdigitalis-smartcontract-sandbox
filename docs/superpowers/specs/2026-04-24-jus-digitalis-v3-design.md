# JUS DIGITALIS v3 — Geliştirme Tasarım Dökümanı

**Tarih:** 2026-04-24  
**Temel:** v2_7.jsx (JusDigitalis.com sandbox)  
**Hedef:** 4 fazda kod kalitesi, UX, dönüşüm ve yeni özellik geliştirmeleri  
**Yaklaşım:** Temiz Port (Approach B) — v2_7.jsx'e dokunmadan yeni `src/` yapısı, adım adım taşıma

---

## Genel Faz Planı

| Faz | Konu | Öncelik |
|-----|------|---------|
| 1 | Kod Kalitesi — TypeScript + Modüler `src/` | İlk |
| 2 | UX — Mobil, animasyon, hata yönetimi | İkinci |
| 3 | Dönüşüm — A/B test, akıllı CTA, sosyal kanıt | Üçüncü |
| 4 | Yeni Özellikler — QUICK_DEMO, SCENARIO_MODE, COMPARISON_TOOL | Dördüncü |

---

## Faz 1 — Kod Kalitesi (TypeScript + Modüler Yapı)

### Yaklaşım
v2_7.jsx'e dokunulmaz. Yeni `src/` klasörü oluşturulur, mantık adım adım typed modüllere taşınır. Her adım bağımsız deploy edilebilir durumda kalır. v2_7.jsx ancak tüm taşıma tamamlandıktan sonra silinir.

### Klasör Yapısı

```
src/
├── main.tsx
├── App.tsx                        # Root — sadece routing + layout
├── types/
│   └── index.ts                   # Tüm interface ve type tanımları
├── constants/
│   ├── game.ts                    # Oranlar, eşikler, sayısal sabitler
│   ├── bots.ts                    # BOTS dizisi (typed Bot interface)
│   ├── lawyers.ts                 # LAWYERS dizisi (typed Lawyer interface)
│   ├── events.ts                  # RANDOM_EVENTS, YEAR_EVENT_POOL, ARB_EVENT_POOL
│   ├── judge.ts                   # JUDGE_* sabitleri ve dialogları
│   └── legalTerms.ts              # LEGAL_TERMS sözlüğü
├── utils/
│   ├── math.ts                    # computeDynamicReward, computeSuccessRate, computeAutopsy vb.
│   ├── trust.ts                   # applyTrustUpdate, getReputationBadge, computePlayerReputation
│   ├── persistence.ts             # loadPersisted, savePersisted
│   └── analytics.ts               # track(), logSimulation(), getABVariant(), _flush()
├── hooks/
│   ├── useGameState.ts            # Ana oyun state'i — tek typed state object
│   ├── useTimeTunnel.ts           # TimeTunnel ilerleme ve yıl geçiş mantığı
│   └── useCoinAnimation.ts        # Animasyon kuyruğu (v2.5 bug fix dahil)
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── CoinDisplay.tsx
│   ├── game/
│   │   ├── BotCard.tsx            # React.memo ile sarılı
│   │   ├── ContractBuilder.tsx
│   │   ├── TimeTunnel.tsx
│   │   ├── EconomicAutopsy.tsx    # basePrice prop eklendi (v2.5 bug fix)
│   │   └── ResultModal.tsx
│   ├── modals/
│   │   ├── BankruptcyModal.tsx
│   │   ├── LoanModal.tsx
│   │   └── LegalTermModal.tsx
│   └── ui/
│       ├── Tooltip.tsx
│       ├── ConfettiOverlay.tsx
│       └── JudgeDialogue.tsx
└── styles/
    └── global.css                 # GLOBAL_CSS string → gerçek CSS dosyası
```

### Port Sırası
1. `types/index.ts` + `constants/` → sadece veri, sıfır çalışma riski
2. `utils/` → saf fonksiyonlar, birim test yazılabilir
3. `hooks/` → state mantığı UI'dan ayrışır
4. `components/` → UI parçalar birer birer taşınır
5. `styles/global.css` → CSS string'den gerçek dosyaya
6. `App.tsx` her şeyi birleştirir, `v2_7.jsx` silinir

### TypeScript Kararları
- Merkezi tipler `types/index.ts`'de: `Bot`, `Lawyer`, `GameState`, `ContractParams`, `AutopsyResult`, `RandomEvent`, `LegalTerm`
- `BOTS` ve `LAWYERS` `as const satisfies Bot[]` ile sabit tip güvencesi
- `useGameState` hook'u tek bir `GameState` objesi döner — prop drilling biter
- `analytics.ts`'de event isimleri `union type` ile kısıtlanır: `'SESSION_START' | 'BOT_SELECT' | 'METHOD_CHOICE' | 'SC_ARCHITECT' | 'CONTRACT_OUTCOME' | 'COMPARISON_VIEW' | 'CTA_CLICK' | 'EXIT_INTENT' | 'SIM_DATA' | 'QUICK_DEMO_START' | 'QUICK_DEMO_COMPLETE'`

---

## Faz 2 — UX İyileştirmeleri

### Mobil Responsive
- Bot kartları: 3 kolondan mobilde tek kolona (`grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`)
- ContractBuilder slider'ları: dokunmatik için `min-height: 44px` hedef alan
- TimeTunnel: dikey scroll yerine yatay swipe destekli (touch event handler)
- Modal'lar: `max-height: 90dvh` + iç scroll, mobilde taşma yok
- Breakpoint: `768px` (tablet) ve `480px` (mobil)

### Animasyon Temizliği
- v2.7'deki 15 `@keyframes` gözden geçirilir, çakışanlar birleştirilir
- `useCoinAnimation` hook'u: `useRef` ile kuyruk yönetimi, animasyon bitmeden yeni animasyon başlatılmaz (v2.5 spec bug fix #4)
- `ConfettiOverlay.tsx` ve loss-flash efekti ayrı bileşenlere çıkar
- `prefers-reduced-motion` media query: animasyonlar devre dışı bırakılabilir

### Loading & Smooth Transitions
- TimeTunnel yıl geçişlerinde `useTransition` (React 18) ile non-blocking update
- Bot kartları ilk yüklemede skeleton placeholder gösterir

### Error Boundary Güçlendirme
Mevcut `JusErrorBoundary` yalnızca `window.location.reload()` yapıyor. Yeni davranış:
1. Hata yakalanır, localStorage'daki son geçerli state okunur
2. Kullanıcıya "Kaldığın Yerden Devam Et" seçeneği sunulur
3. Devam edilemiyorsa sıfırlama seçeneği gösterilir
4. Her iki durumda da analytics'e hata eventi gönderilir

---

## Faz 3 — Dönüşüm / İkna

### A/B Test Altyapısı (Gerçek Uygulama)
v2.7'deki `getABVariant()` localStorage'a yazıyor ama UI'a bağlı değil. Faz 3'te:
- `forceClassicFirst` variant: kullanıcı ilk bot seçiminde klasik yönteme yönlendirilir
- `aiAdvisorProminent` variant: CTA büyütülür, hero section'da görünür
- `freeChoice` variant: mevcut serbest seçim davranışı (kontrol grubu)
- Her analytics event'ine `abVariant` alanı eklenir
- `useABVariant` hook'u variant state'ini yönetir

### Akıllı CTA Sistemi
`useCTAState` hook'u session history okur, doğru CTA'yı döner:

| Senaryo | Primary CTA | Renk |
|---------|-------------|------|
| Klasik kaybetti, SC denemedi | "Smart Contract ile Aynı Anlaşmayı Simüle Et" | Kırmızı/urgent |
| SC başarılı | "Gerçek Sözleşmenizi Smart Contract'a Dönüştürün" | Yeşil/success |
| 3+ session, kararsız | "Demo Görüşme Ayarlayın" | Mavi/personal |
| Default | "Daha Fazla Senaryo Dene" | Nötr |

### Sosyal Kanıt Widget'i (`SocialProofWidget.tsx`)
`/api/sandbox-analytics`'ten aggregate veri çeker. API dönmezse statik fallback kullanır:
- Bugün kaç kişi denedi
- % kaçı SC tercih etti
- Ortalama tasarruf miktarı (JC)
- Kaçınılan konkordato sayısı

### Kayıp Aversion Hesaplayıcı
EconomicAutopsy bileşenine eklenir. Mevcut `computeOpportunityCostHuman()` kullanılır:
- "X JusCoin = Y çalışma saati = Z hafta kaybı" somutlaştırması
- "SC seçilseydi kurtarılacak miktar: X JC" vurgusu

---

## Faz 4 — Yeni Özellikler

### Routing
`react-router-dom` eklenir:

```
/           → FULL_SIMULATION (mevcut oyun)
/demo       → QUICK_DEMO
/scenarios  → SCENARIO_MODE
/compare    → COMPARISON_TOOL
```

### QUICK_DEMO (`/demo`)
Ana sayfaya embed edilebilir bağımsız bileşen, ~30 saniye:
- Bot sabit: Fırsatçı Freelancer (en dramatik kontrast)
- Klasik vs SC eş zamanlı çalışır, yan yana sonuç gösterilir
- Animasyonlar hızlandırılmış (TimeTunnel skip edilir)
- Tek aksiyon butonu: "Detaylı Simülasyona Geç" → `/`
- Analytics: minimal event seti (`QUICK_DEMO_START`, `QUICK_DEMO_COMPLETE`)
- `?mode=quick` query param ile de erişilebilir

### SCENARIO_MODE (`/scenarios`)
3 gerçek vaka senaryosu. Her senaryo: bağlam kartı → oyun → öğrenme özeti ekranı.

| Senaryo | Bot | Öğrenme Hedefi |
|---------|-----|----------------|
| İthalat Krizi 2024 | Fırsatçı | Döviz şoku + force majeure riski |
| Yazılım Projesi Teslimatı | Fırsatçı Freelancer | Milestone ispatlama güçlüğü |
| İnşaat Gecikme Davası | İnşaat Müteahhit | 10 yıllık dava maliyeti |

Senaryo konfigürasyonları `constants/scenarios.ts`'de tanımlanır. `ScenarioMode.tsx` bileşeni config'i okur, FULL_SIMULATION mantığını kısıtlı parametrelerle çalıştırır.

### COMPARISON_TOOL (`/compare`)
Kullanıcı parametrelerini girer, anlık karşılaştırma alır:
- Giriş: `contractValue`, `counterpartyRisk` (düşük/orta/yüksek), `durationMonths`, `jurisdiction`
- Çıktı: klasik vs SC yan yana risk tablosu
- Hesaplama: mevcut `computeAutopsy()` ve `computeSuccessRate()` fonksiyonları kullanılır
- CTA: sonuç ekranının altında akıllı CTA sistemi devreye girer

---

## Kısıtlar (v2.5 spec'ten korunur)

- Oyunlaştırma elementleri (puan, rozet, liderlik tablosu) eklenmez — ciddi sandbox algısını zedeler
- Dil tonu: profesyonel ve eğitici
- İlk etkileşim 5 saniye içinde olmalı
- Analytics'te PII yok
- Her faz bağımsız deploy edilebilir — fazlar arası bağımlılık minimize edilir
