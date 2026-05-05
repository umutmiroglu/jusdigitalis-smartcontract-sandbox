# Aşama 1 Terminoloji Temizliği — Tasarım Dökümanı

**Tarih:** 2026-05-05
**Kapsam:** src/ içindeki tüm kullanıcıya görünen metinlerde yasaklı terminolojinin değiştirilmesi
**Kaynak:** CLAUDE.md Yasaklı Terminoloji bölümü + data/legal/terminology-map.json
**Hedef:** 2027 baharı HSK Yüksek Müşaviri görüşmesi için regülatör-güvenli dil

---

## Değişmeyen (Kapsam Dışı)

- Kod tanımlayıcıları: `useOracle`, `ORACLE_FEE`, `oracleFee`, `scRate`, `scSaving`, `sc_` prefix'li her şey
- TypeScript tip tanımları (`ContractParams.useOracle` vb.)
- Oyun mantığı — tek bir satır bile değişmez
- `docs/`, `v2_5_spec.md`, eski plan dosyaları — tarihsel arşiv
- `package-lock.json` içindeki `css-tokenizer`, `js-tokens` — paket isimleri, false positive

---

## Substitüsyon Kuralları

| Kaynak | Hedef | Kullanım yeri |
|---|---|---|
| "smart contract" / "Smart Contract" (uzun bağlam) | "koşullu otomatik ifa sözleşmesi" | Açıklama cümleleri |
| "Smart Contract" (kısa etiket) | "koşullu ifa" | Butonlar, başlıklar, sütun isimleri |
| "oracle" / "Oracle" (UI metin) | "doğrulama mekanizması" | Etiketler, açıklamalar |
| "Oracle Entegrasyonu" (toggle) | "Doğrulama Mekanizması" | ContractBuilder toggle |
| "blockchain" | "dijital icra altyapısı" | events.ts etkinlik metni |
| legalTerms `oracle` anahtarı | `dogrulamaMekanizmasi` | Tooltip sözlüğü |
| Karakter diyalogları | Doğal Türkçe rewrite (mekanik değiştirme değil) | bots.ts |

---

## Dosya Sırası ve Değişimler

### 1. src/constants/bots.ts

`dialogues.greet` ve `dialogues.smart` satırları — doğal rewrite:

**honest bot:**
- `greet[0]`: `"Biz yaşlı adamız, ne anlarız bu bilgisayarlı sözleşme denen şeyden…"`
- `smart[0]`: `"Koşullu ifa sözleşmesi mi? Tamam tamam, imzalıyorum."`
- `smart[1]`: değişmez — `"Bilgisayarlar benim yerime mi konuşacak şimdi?"`

**opportunist bot:**
- `smart[0]`: `"Otomatik ifa ha? İade ediliyor… ilginç."`
- `smart[1]`: değişmez

**contractor bot:**
- `smart[0]`: `"Otomatik ifa, taşınmazlarda mı? İlginç."`
- `smart[1]`: değişmez

### 2. src/constants/events.ts

- Satır 7: `"Blockchain altyapısına rekor yatırım. Smart Contract başarısı +%15."` →
  `"Dijital icra altyapısına rekor yatırım. Koşullu ifa sözleşmesi başarısı +%15."`

### 3. src/constants/legalTerms.ts

- `cezaiSart.detail`: "Smart Contract'ta cezai şart" → "koşullu otomatik ifa sözleşmesinde cezai şart"
- `forceMajeure.detail`: "Oracle entegrasyonu ile force majeure" → "doğrulama mekanizması ile force majeure"
- `oracle` anahtarı → `dogrulamaMekanizmasi`:
  - `short`: `"Doğrulama Mekanizması"`
  - `definition`: `"Sözleşme koşullarının gerçekleşip gerçekleşmediğini bağımsız olarak doğrulayan sistem."`
  - `detail`: `"TBK md. 136. Koşulların otomatik doğrulanması force majeure anlaşmazlıklarını önler."`
  - `ref`: `"Borçlar Hukuku"`
- `temerrut.detail`: "Smart Contract'ta temerrüt" → "koşullu otomatik ifa sözleşmesinde temerrüt"

**Not:** `legalTerms` nesnesindeki anahtar `oracle`'dan `dogrulamaMekanizmasi`'na dönüştüğü için,
`ContractBuilder.tsx`'teki `<LegalTermTooltip termKey="oracle">` çağrısı da güncellenir.

### 4. src/constants/scenarios.ts

Her 3 senaryonun `description` ve `learningGoal` metinleri:
- "smart contract" → "koşullu otomatik ifa sözleşmesi"
- "oracle doğrulaması" → "doğrulama mekanizması"
- "oracle korumalı smart contract" → "doğrulama mekanizmalı koşullu ifa sözleşmesi"

### 5. src/hooks/useCTAState.ts

3 CTA etiketi:
- `"Smart Contract ile Riski Sıfırla"` → `"Koşullu İfa ile Riski Sıfırla"`
- `"Gerçek Smart Contract Kur"` → `"Koşullu Otomatik İfa Sözleşmesi Kur"`
- `"Smart Contract Hakkında Bilgi Al"` → `"Koşullu İfa Hakkında Bilgi Al"`
- Yorum satırı: `// Priority 2: success — smart contract win` → `// Priority 2: success — koşullu ifa win`

### 6. src/components/game/ContractBuilder.tsx

- `h3` başlığı: `"Smart Contract Mimarı"` → `"Sözleşme Tasarımcısı"`
- LegalTermTooltip: `termKey="oracle"` → `termKey="dogrulamaMekanizmasi"`
- Toggle etiketi: `"Oracle Entegrasyonu"` → `"Doğrulama Mekanizması"`

### 7. src/components/game/EconomicAutopsy.tsx

- Satır 61: `"⚡ Smart Contract"` → `"⚡ Koşullu İfa"`
- Satır 109: `"✓ Smart Contract olsaydı:"` → `"✓ Koşullu ifa sözleşmesi olsaydı:"`

### 8. src/pages/GamePage.tsx

- Satır 284: `'Smart Contract'` (forced method) → `'Koşullu İfa'`
- Satır 318: `<div>Smart Contract</div>` → `<div>Koşullu İfa</div>`
- Satır 354 progress metni: `'Oracle verisi çekiliyor…'` → `'Koşullar doğrulanıyor…'`
- Satır 421: `title="SMART CONTRACT ÖZETI"` → `title="KOŞULLU İFA ÖZETİ"`
- Satır 471 buton: `"Smart Contract ile Karşılaştır →"` → `"Koşullu İfa ile Karşılaştır →"`
- Satır 612: `"JusDigitalis Smart Contract Sandbox"` → `"JusDigitalis Koşullu İfa Sandbox"`

### 9. src/pages/QuickDemo.tsx

- Satır 117: `"Smart Contract simüle edilir."` → `"Koşullu ifa sözleşmesi simüle edilir."`
- Satır 128: `"Smart → oracle koruması"` → `"Koşullu ifa → doğrulama koruması"`
- Satır 153: `"Smart contract çalıştırılıyor…"` → `"Koşullu ifa sözleşmesi çalıştırılıyor…"`
- Satır 208: `"⚡ Smart Contract"` → `"⚡ Koşullu İfa"`
- Satır 218: `"🔒 Oracle korumalı"` → `"🔒 Doğrulama mekanizmalı"`
- Satır 242: `"Smart Contract X JC daha iyi"` → `"Koşullu İfa X JC daha iyi"`

### 10. src/pages/ScenarioMode.tsx

- Satır 43: `"smart contract'ın hukuki ve ekonomik avantajlarını"` → `"koşullu otomatik ifa sözleşmesinin hukuki ve ekonomik avantajlarını"`
- Satır 142: `'Smart Contract'` (forced method) → `'Koşullu İfa'`

### 11. src/pages/ComparisonTool.tsx

- Satır 163: `"smart contract'ı yan yana karşılaştırın"` → `"koşullu ifa sözleşmesini yan yana karşılaştırın"`
- Satır 276: `"Smart Contract Öneriliyor"` → `"Koşullu İfa Öneriliyor"`
- Satır 283: `"Oracle koruması bu sözleşme profilinde"` → `"Doğrulama mekanizması bu sözleşme profilinde"`
- Satır 314: `"⚡ SMART CONTRACT"` → `"⚡ KOŞULLU İFA"`
- Satır 319: `label="Oracle ücreti"` → `label="Doğrulama ücreti"`
- Satır 328: `"⚡ Smart Contract, klasik yönteme kıyasla"` → `"⚡ Koşullu ifa sözleşmesi, klasik yönteme kıyasla"`

### 12. src/utils/math.ts

- Satır 100: `"Smart Contract seçerek ${courtFee} JC harç + ..."` →
  `"Koşullu ifa sözleşmesi seçerek ${courtFee} JC harç + ..."`

### 13. src/test/ (UI değişikliklerinin ardından)

- `useCTAState.test.ts:6` — test ismi: `'Smart Contract in label'` → `'koşullu ifa in label'`
- `useCTAState.test.ts:13` — assertion: `.toContain('Smart Contract')` → `.toContain('Koşullu İfa')`

---

## Doğrulama Stratejisi

Her dosya tamamlandıktan sonra:
```bash
npm run typecheck   # tip hatası yok
npm run test        # testler geçiyor
```

Tüm dosyalar bittikten sonra:
```bash
grep -ri "smart contract\|blockchain\|oracle\|crypto\|web3\|distributed ledger" src/ --include="*.ts" --include="*.tsx"
```
Sonuç sıfır olmalı (kod tanımlayıcıları hariç — bunlar `useOracle`, `ORACLE_FEE` şeklinde geçer, string olarak değil).

---

## Commit Stratejisi

Her dosya grubu için ayrı commit:
1. `refactor(terminology): update constants — bots, events, legalTerms, scenarios`
2. `refactor(terminology): update hooks — useCTAState`
3. `refactor(terminology): update components — ContractBuilder, EconomicAutopsy`
4. `refactor(terminology): update pages — GamePage, QuickDemo, ScenarioMode, ComparisonTool`
5. `refactor(terminology): update utils and tests`
