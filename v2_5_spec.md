# JUS DIGITALIS v2.5 — Geliştirme Spesifikasyonu

**Hedef:** v2.4 kodunu analiz et, kritik hataları düzelt, belirtilen özellikleri ekle.  
**Entegrasyon:** JusDigitalis.com — kullanıcıların Smart Contract (SC) üstünlüğünü deneyimle keşfettiği sandbox.  
**Birincil amaç:** Veri toplama ve ikna. Oyun ikincil.

---

## KRİTİK BUG DÜZELTMELERİ

### 1. Trust Discount Mantığı Tutarsızlığı
**Problem:** `SliderParam`'da `trustDiscount` UI'da gösteriliyor ama gerçek `params.penaltyRate` state'i değişmiyor. Kullanıcı indirim görüyor ama hesaplamada tam fiyat ödüyor.  
**Çözüm:**
- `params.effectivePenaltyRate` state'i ekle
- `useEffect`'te otomatik hesapla: `effectivePenaltyRate = max(0, penaltyRate - trustDiscount)`
- Tüm hesaplamalarda (`totalCost`, `botEvaluateContract`, `executeSmart`) bu değeri kullan
- UI'da hem orijinal hem indirimli fiyatı göster

### 2. EconomicAutopsy'de Mahkeme Harcı Hesaplama Hatası
**Problem:** `computeCourtFee(autopsy.inflationLoss)` çağrısı hatalı — `inflationLoss` bir fiyat değil.  
**Çözüm:** `EconomicAutopsy` component'ine `basePrice` prop'u ekle, `computeCourtFee(basePrice)` olarak hesapla.

### 3. Domino Etkisi Dengesizliği
**Problem:** `dominoBumps` sadece `resetGame`'de sıfırlanıyor; sürekli başarısızlık oyunu imkansızlaştırıyor.  
**Çözüm:**
- Başarılı Smart Contract kullanımı (`sc_success` event) domino etkisini azaltsın
- `DOMINO_RECOVERY = 0.05`
- Minimum `dominoBump = 0`

### 4. CoinChange Animation Çakışması
**Problem:** Hızlı ardışık işlemlerde animasyonlar üst üste biniyor.  
**Çözüm:** `useRef` ile animasyon kuyruğu tut; animasyon bitmeden yeni animasyon başlatma.

---

## VERİ TOPLAMA ALTYAPISI

Tüm kullanıcı etkileşimlerini kaydet. PII yok.

### Analytics Event Schema
| Event | Alanlar |
|---|---|
| `SESSION_START` | timestamp, userAgent, referrer |
| `BOT_SELECT` | botId, trustScoreAtSelect, timeSpentOnCardMs |
| `METHOD_CHOICE` | chosenMethod, rejectedMethod, reasoningTimeMs |
| `SC_ARCHITECT` | botId, timeout, penaltyRate, useOracle, trustDiscountApplied, botResponse, priceBumpPercent |
| `CONTRACT_OUTCOME` | botId, method, success, profitLoss, durationSeconds, konkordatoTriggered, lawyerChosen, legalMode, yearsSpent |
| `COMPARISON_VIEW` | viewedAfterOutcome, timeSpentOnAutopsyMs, scAdvantageRealized |
| `CTA_CLICK` | ctaType |
| `EXIT_INTENT` | lastInteraction, sessionDurationMs |

### Backend Entegrasyonu
- `fetch('/api/sandbox-analytics', { keepalive: true })`
- Offline queue için `localStorage`
- Flush: her event sonrası dene; başarısız olursa queue'da beklet

### A/B Test Altyapısı
| Variant | Açıklama |
|---|---|
| A | `forceClassicFirst` — kullanıcı önce klasik yöntemi dener |
| B | `freeChoice` — serbest seçim (mevcut davranış) |
| C | `aiAdvisorProminent` — AI advisor CTA ön planda |

---

## İKNA PSİKOLOJİSİ

### "Aha!" Anı Tasarımı
**Klasik yöntemde kaybetme hissi maksimize edilsin:**
1. Bot bahanesi diyaloğu
2. Anında mahkeme harcı düşümü animasyonu
3. Zorunlu avukat seçimi (3 seçenek, hepsi yetersiz hissi)
4. Uzun time tunnel (yıl yıl ilerleme)
5. Konkordato veya kayıp sonucu
6. **Otomatik SC karşılaştırması** ardından göster

**SC başarısızlığı bile kazanç hissi versin:**
- Anında iade animasyonu (vault → refunded)
- "Paran güvende" mesajı
- Autopsy'de kurtarılan kayıpların vurgulanması

### Sosyal Kanıt Widget'i
Gerçek aggregate veri göster:
- Bugün kaç kişi denedi
- % kaçı SC tercih etti
- Ortalama tasarruf miktarı
- Kaçınılan konkordato sayısı

### Kayıp Aversion Hesaplayıcı
`opportunityCost`'i somutlaştır:
- X JusCoin = Y çalışma saati
- = Z hafta çalışma kaybı
- SC koruması: % kaçı kurtarılırdı

---

## YENİ MODÜLLER

### QUICK_DEMO (30 saniye)
- Tek tıkla SC vs Klasik otomatik karşılaştırması
- Bot: Fırsatçı Freelancer (dramatik kontrast için)
- Her iki yöntem eş zamanlı çalışır, yan yana sonuç
- Minimal veri toplama
- Ana sayfada embed edilebilir

### FULL_SIMULATION (mevcut oyun, 3-5 dk)
- Mevcut v2.4 oyun akışı (tüm bug'lar düzeltilmiş)
- Full analytics veri toplama
- localStorage persistence

### SCENARIO_MODE (5-7 dk)
Gerçek vaka senaryoları:
- **İthalat Krizi 2024** — Döviz kuru şoku, piyasa krizi aktif
- **Yazılım Projesi Teslimatı** — Freelancer, milestone, ispatlama güçlüğü
- **İnşaat Gecikme Davası** — Müteahhit, 10 yıllık süreç

Her senaryo: bağlam açıklaması + öğrenme hedefi + istatistik

### COMPARISON_TOOL (2 dk)
Kullanıcı parametreleri girer:
- `contractValue` (sözleşme bedeli)
- `counterpartyRisk` (düşük/orta/yüksek)
- `durationMonths` (süre)
- `jurisdiction` (Türkiye / Uluslararası)

Çıktı: side-by-side risk analizi tablosu

---

## AKILLI CTA SİSTEMİ

Kullanıcı durumuna göre değişen CTA'lar:

| Senaryo | Primary CTA | Secondary CTA |
|---|---|---|
| Klasik'te kaybetti, SC denemedi | "Smart Contract ile Aynı Anlaşmayı Simüle Et" (urgent) | "Ücretsiz Hukuki Danışmanlık Al" |
| SC'de başarılı | "Gerçek Sözleşmenizi Smart Contract'a Dönüştürün" (success) | "Beyaz Kağıdı İndir" |
| 3+ session, kararsız | "Demo Görüşme Ayarlayın" (personal) | — |
| Default | "Daha Fazla Senaryo Dene" | "Bültene Kaydol" |

---

## TEKNİK İYİLEŞTİRMELER

### localStorage Persistence
Kaydet/yükle: `coins`, `trustScores`, `stats`, `capitalProtected`, `legalRisk`

### React.memo Optimizasyonu
`BotCard` ve `CoinDisplay` component'leri için

### Error Boundary
`JusErrorBoundary` class component:
- Hata durumunda: "Sistem Hatası — Sıfırla ve Yeniden Başla"
- Sıfırlama: `localStorage` temizle + `window.location.reload()`
- Hata olayını analytics'e gönder

### Educational Tooltip Sistemi
`LegalTerms` sözlüğü (en az 5 terim):
- Konkordato (TİK md. 285-309)
- Cezai Şart (TBK md. 179-182)
- Force Majeure (TBK md. 136)
- Oracle (Blockchain Hukuku)
- Temerrüt (TBK md. 117)

Her tooltip'te "Daha fazla bilgi →" butonu ile tam açıklama modal'ı

---

## KISITLAR

- Oyunlaştırma elementleri (puan, rozet, liderlik tablosu) **EKLENMEYECEK** — ciddi sandbox algısını zedeler
- Dil tonu: profesyonel ve eğitici, azarlayıcı değil
- İlk etkileşim 5 saniye içinde olmalı
- Analytics'te PII yok

---

## ÇIKTI FORMATI

- Tam, çalışır React kodu
- Tek dosya (`v2_5.jsx`)
- Tüm yeni özellikler entegre
- Header: `JUS DIGITALIS v2.5 — Sandbox & Analytics Edition`
