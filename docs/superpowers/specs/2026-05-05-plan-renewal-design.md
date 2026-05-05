# Plan Yenileme — Tasarım Dökümanı

**Tarih:** 2026-05-05
**Kapsam:** Tamamlanan teknik fazların işaretlenmesi + köprü durum belgesi oluşturulması
**Yaklaşım:** Minimal köprü (Yaklaşım A)

---

## Bağlam

v3 teknik fazları (Faz 1–4) tamamlandı. CLAUDE.md'de tanımlı 5 aşamalı politika roadmap'i başlıyor.
Eski plan dosyaları geçersiz değil — referans değeri var ve git history'de kalmalı.
Yeni bir Claude instance açtığında "ne bitti, neredeyiz, ne geliyor?" sorularının tek bakışta cevaplanması gerekiyor.

---

## Kararlar

### 1. Eski plan dosyalarına STATUS banner'ı eklenir

Her `docs/superpowers/plans/2026-04-24-phase*.md` dosyasının ilk satırına:

```
> **STATUS: TAMAMLANDI** — 2026-05-05 | Teknik referans olarak korunur.
```

- İçerik değişmez, yalnızca başlık eklenir.
- 4 dosya: phase1-typescript-refactor, phase2-ux-improvements, phase3-conversion-optimization, phase4-new-features.

### 2. `docs/superpowers/STATUS.md` oluşturulur

Yapısı:

```
## Referans
CLAUDE.md > Geliştirme Aşamaları — asıl roadmap oradadır.

## Teknik Altyapı (v3 Faz 1–4) — TAMAMLANDI
- [x] Faz 1: TypeScript + modüler src/
- [x] Faz 2: UX iyileştirmeleri (mobil, animasyon, error boundary)
- [x] Faz 3: Dönüşüm (A/B test, akıllı CTA, sosyal kanıt)
- [x] Faz 4: QUICK_DEMO, SCENARIO_MODE, COMPARISON_TOOL

## Şu an neredeyiz
CLAUDE.md Aşama 1 başlangıcı.
Hedef: terminoloji temizliği + karakter diyalogları + sonuç ekranı dili.

## Bir sonraki eylem
Aşama 1 için implementation plan oluşturulacak:
`docs/superpowers/plans/2026-05-05-asama1-terminology-refactor.md`
```

### 3. STATUS.md roadmap içermez

STATUS.md kendi roadmap'ini tutmaz. "CLAUDE.md'nin Aşama X'indeyiz" der.
Roadmap tek yerde yaşar: CLAUDE.md.

---

## Dosya Listesi

| İşlem | Dosya |
|-------|-------|
| Düzenle | `docs/superpowers/plans/2026-04-24-phase1-typescript-refactor.md` |
| Düzenle | `docs/superpowers/plans/2026-04-24-phase2-ux-improvements.md` |
| Düzenle | `docs/superpowers/plans/2026-04-24-phase3-conversion-optimization.md` |
| Düzenle | `docs/superpowers/plans/2026-04-24-phase4-new-features.md` |
| Oluştur | `docs/superpowers/STATUS.md` |
