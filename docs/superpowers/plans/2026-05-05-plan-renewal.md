# Plan Yenileme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tamamlanan 4 teknik faz planını STATUS banner'ı ile işaretle ve proje durumunu özetleyen `docs/superpowers/STATUS.md` köprü belgesini oluştur.

**Architecture:** Her plan dosyasının başına tek satır banner eklenir (içerik değişmez). Ardından `STATUS.md` oluşturulur — bu dosya roadmap içermez, yalnızca CLAUDE.md'ye referans verir ve şu anki konumu gösterir.

**Tech Stack:** Dosya düzenleme + git commit.

---

## Dosya Listesi

| İşlem | Dosya |
|-------|-------|
| Düzenle | `docs/superpowers/plans/2026-04-24-phase1-typescript-refactor.md` |
| Düzenle | `docs/superpowers/plans/2026-04-24-phase2-ux-improvements.md` |
| Düzenle | `docs/superpowers/plans/2026-04-24-phase3-conversion-optimization.md` |
| Düzenle | `docs/superpowers/plans/2026-04-24-phase4-new-features.md` |
| Oluştur | `docs/superpowers/STATUS.md` |

---

### Task 1: Phase 1 planına STATUS banner ekle

**Files:**
- Modify: `docs/superpowers/plans/2026-04-24-phase1-typescript-refactor.md` (satır 1'den önce)

- [ ] **Step 1: Dosyanın mevcut ilk satırını oku ve banner'ı ekle**

Dosyanın başına şu satırı ekle (mevcut `# Phase 1 ...` başlığından önce):

```
> **STATUS: TAMAMLANDI** — 2026-05-05 | Teknik referans olarak korunur.

```

Sonuç — dosyanın ilk 3 satırı şöyle görünmeli:
```
> **STATUS: TAMAMLANDI** — 2026-05-05 | Teknik referans olarak korunur.

# Phase 1 — TypeScript + Modüler src/ Refactor Implementation Plan
```

- [ ] **Step 2: Değişikliği doğrula**

```bash
head -3 docs/superpowers/plans/2026-04-24-phase1-typescript-refactor.md
```

Beklenen çıktı:
```
> **STATUS: TAMAMLANDI** — 2026-05-05 | Teknik referans olarak korunur.

# Phase 1 — TypeScript + Modüler src/ Refactor Implementation Plan
```

---

### Task 2: Phase 2 planına STATUS banner ekle

**Files:**
- Modify: `docs/superpowers/plans/2026-04-24-phase2-ux-improvements.md` (satır 1'den önce)

- [ ] **Step 1: Banner'ı ekle**

Dosyanın başına şu satırı ekle (mevcut `# Phase 2 ...` başlığından önce):

```
> **STATUS: TAMAMLANDI** — 2026-05-05 | Teknik referans olarak korunur.

```

Sonuç — dosyanın ilk 3 satırı:
```
> **STATUS: TAMAMLANDI** — 2026-05-05 | Teknik referans olarak korunur.

# Phase 2 — UX İyileştirmeleri Implementation Plan
```

- [ ] **Step 2: Değişikliği doğrula**

```bash
head -3 docs/superpowers/plans/2026-04-24-phase2-ux-improvements.md
```

Beklenen çıktı:
```
> **STATUS: TAMAMLANDI** — 2026-05-05 | Teknik referans olarak korunur.

# Phase 2 — UX İyileştirmeleri Implementation Plan
```

---

### Task 3: Phase 3 planına STATUS banner ekle

**Files:**
- Modify: `docs/superpowers/plans/2026-04-24-phase3-conversion-optimization.md` (satır 1'den önce)

- [ ] **Step 1: Banner'ı ekle**

Dosyanın başına şu satırı ekle (mevcut `# Phase 3 ...` başlığından önce):

```
> **STATUS: TAMAMLANDI** — 2026-05-05 | Teknik referans olarak korunur.

```

Sonuç — dosyanın ilk 3 satırı:
```
> **STATUS: TAMAMLANDI** — 2026-05-05 | Teknik referans olarak korunur.

# Phase 3 — Dönüşüm / İkna Optimizasyonu Implementation Plan
```

- [ ] **Step 2: Değişikliği doğrula**

```bash
head -3 docs/superpowers/plans/2026-04-24-phase3-conversion-optimization.md
```

Beklenen çıktı:
```
> **STATUS: TAMAMLANDI** — 2026-05-05 | Teknik referans olarak korunur.

# Phase 3 — Dönüşüm / İkna Optimizasyonu Implementation Plan
```

---

### Task 4: Phase 4 planına STATUS banner ekle

**Files:**
- Modify: `docs/superpowers/plans/2026-04-24-phase4-new-features.md` (satır 1'den önce)

- [ ] **Step 1: Banner'ı ekle**

Dosyanın başına şu satırı ekle (mevcut `# Phase 4 ...` başlığından önce):

```
> **STATUS: TAMAMLANDI** — 2026-05-05 | Teknik referans olarak korunur.

```

Sonuç — dosyanın ilk 3 satırı:
```
> **STATUS: TAMAMLANDI** — 2026-05-05 | Teknik referans olarak korunur.

# Phase 4 — Yeni Özellikler Implementation Plan
```

- [ ] **Step 2: Değişikliği doğrula**

```bash
head -3 docs/superpowers/plans/2026-04-24-phase4-new-features.md
```

Beklenen çıktı:
```
> **STATUS: TAMAMLANDI** — 2026-05-05 | Teknik referans olarak korunur.

# Phase 4 — Yeni Özellikler Implementation Plan
```

---

### Task 5: STATUS.md köprü belgesini oluştur

**Files:**
- Create: `docs/superpowers/STATUS.md`

- [ ] **Step 1: Dosyayı oluştur**

`docs/superpowers/STATUS.md` içeriği:

```markdown
# Proje Durum Belgesi

> **Roadmap için:** `CLAUDE.md` > "Geliştirme Aşamaları" bölümüne bak. Asıl plan oradadır.
> Bu dosya yalnızca "neredeyiz?" sorusunu yanıtlar.

---

## Teknik Altyapı (v3 Faz 1–4) — TAMAMLANDI

- [x] Faz 1: TypeScript + modüler `src/` yapısı → `plans/2026-04-24-phase1-typescript-refactor.md`
- [x] Faz 2: UX iyileştirmeleri (mobil, animasyon, error boundary) → `plans/2026-04-24-phase2-ux-improvements.md`
- [x] Faz 3: Dönüşüm (A/B test, akıllı CTA, sosyal kanıt) → `plans/2026-04-24-phase3-conversion-optimization.md`
- [x] Faz 4: QUICK_DEMO, SCENARIO_MODE, COMPARISON_TOOL → `plans/2026-04-24-phase4-new-features.md`

Son commit: `fix: JC deduction calculation — correct amount subtraction`

---

## Şu an neredeyiz

**CLAUDE.md Aşama 1 başlangıcı** (Ay 1–3)

Hedef: Terminoloji temizliği + karakter diyalogları + sonuç ekranı dili.

Yapılacaklar:
- Tüm UI metinlerinde ve kod yorumlarında yasaklı terminoloji taraması
- "smart contract" → "koşullu otomatik ifa sözleşmesi" dönüşümü
- Bot diyalog dilinin politika-güvenli hale getirilmesi
- EconomicAutopsy sonuç ekranı dilinin yeniden yazılması

---

## Bir sonraki eylem

Aşama 1 implementation planı oluşturulacak:
`docs/superpowers/plans/2026-05-05-asama1-terminology-refactor.md`

Hazır olduğunda: `/brainstorming Aşama 1: terminoloji temizliği planla`
```

- [ ] **Step 2: Dosyanın oluşturulduğunu doğrula**

```bash
head -5 docs/superpowers/STATUS.md
```

Beklenen çıktı:
```
# Proje Durum Belgesi

> **Roadmap için:** `CLAUDE.md` > "Geliştirme Aşamaları" bölümüne bak. Asıl plan oradadır.
> Bu dosya yalnızca "neredeyiz?" sorusunu yanıtlar.
```

---

### Task 6: Değişiklikleri commit et

**Files:** Tüm düzenlenen ve oluşturulan dosyalar

- [ ] **Step 1: Değişen dosyaları stage'e al**

```bash
git add docs/superpowers/plans/2026-04-24-phase1-typescript-refactor.md
git add docs/superpowers/plans/2026-04-24-phase2-ux-improvements.md
git add docs/superpowers/plans/2026-04-24-phase3-conversion-optimization.md
git add docs/superpowers/plans/2026-04-24-phase4-new-features.md
git add docs/superpowers/STATUS.md
git add docs/superpowers/specs/2026-05-05-plan-renewal-design.md
git add docs/superpowers/plans/2026-05-05-plan-renewal.md
```

- [ ] **Step 2: Commit**

```bash
git commit -m "docs: mark v3 phases complete, add STATUS.md bridge document"
```

Beklenen çıktı: `[main XXXXXXX] docs: mark v3 phases complete, add STATUS.md bridge document`

- [ ] **Step 3: Commit'i doğrula**

```bash
git log --oneline -3
```

Beklenen: En üstte yeni commit görünüyor.
