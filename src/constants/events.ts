import type { RandomEvent, YearEventData } from '../types'

export const RANDOM_EVENTS = [
  // Positive
  { id: 'foreign_capital', type: 'positive' as const, emoji: '💰', title: 'Yabancı Sermaye Girişi',    description: 'Yabancı yatırımcı güveni yükseldi. Hazineye 150 JC eklendi, ödüller +%15.',  effect: { rewardBonus: 0.15, successBonus: 0.08, coinBonus: 150 } },
  { id: 'trade_deal',      type: 'positive' as const, emoji: '🤝', title: 'Ticaret Anlaşması Bonusu', description: 'Yeni ikili ticaret anlaşması imzalandı. Tüm başarı oranları +%10.',          effect: { successBonus: 0.10, dominoBumpReduce: 0.10 } },
  { id: 'tech_boom',       type: 'positive' as const, emoji: '💻', title: 'Teknoloji Yatırım Dalgası', description: 'Dijital icra altyapısına rekor yatırım. Koşullu ifa sözleşmesi başarısı +%15.',        effect: { scSuccessBonus: 0.15, coinBonus: 80 } },
  { id: 'credit_subsidy',  type: 'positive' as const, emoji: '🏛️', title: 'Hazine Kredi Desteği',     description: 'Devlet KOBİ destek paketi açıkladı. Hazineye 100 JC eklendi.',             effect: { coinBonus: 100, successBonus: 0.05 } },
  // Negative
  { id: 'pandemic_shock',  type: 'negative' as const, emoji: '🦠', title: 'Pandemi Şoku',              description: 'Salgın piyasaları sarstı. Başarı oranları düştü, piyasa krizi aktif.',       effect: { crashActive: true } },
  { id: 'supply_crisis',   type: 'negative' as const, emoji: '🚚', title: 'Tedarik Zinciri Krizi',     description: 'Global lojistik kriz. Tüm teslimat süreleri 2 katına çıktı.',               effect: { deliveryTimeMult: 2.0, dominoBump: 0.10 } },
  { id: 'currency_crash',  type: 'negative' as const, emoji: '💸', title: 'Döviz Krizi',               description: 'TL değer kaybetti. Sözleşme ödülleri -%20, fırsat maliyeti arttı.',         effect: { rewardPenalty: 0.20, dominoBump: 0.05 } },
  { id: 'supply_chain',    type: 'negative' as const, emoji: '⛓️', title: 'Tedarik Zinciri Çöküşü',   description: 'Global tedarik zinciri aksadı. Botların teslim ihtimali azaldı.',            effect: { dominoBump: 0.15 } },
] satisfies RandomEvent[]

export const YEAR_EVENT_POOL: Record<number, YearEventData> = {
  1:  { events: ['Dilekçeler mahkemeye sunuldu.', 'Tebligatlar gönderildi.', 'İlk duruşma tarihi belirlendi.'],             winProb: 0.35 },
  2:  { events: ['Bilirkişi atandı.', 'Bilirkişi raporu hazırlandı.', 'Karşı taraf rapora itiraz etti.'],                   winProb: 0.42 },
  3:  { events: ['Yargıtay\'a taşındı.', 'Yargıtay bozma kararı verdi.', 'Yeniden yargılama başladı.'],                     winProb: 0.50 },
  4:  { events: ['Keşif yapıldı.', 'Tanıklar dinlendi.', 'Ara karar verildi.'],                                             winProb: 0.55 },
  5:  { events: ['Uzlaşma görüşmeleri başarısız.', 'İstinaf mahkemesine gidildi.', 'İstinaf kararı bekleniyor.'],           winProb: 0.58 },
  6:  { events: ['Mahkeme dosyası tekrar incelendi.', 'Yeni bilirkişi atandı.', 'Teknik rapor istendi.'],                   winProb: 0.61 },
  7:  { events: ['Hâkim değişikliği nedeniyle dosya yeniden açıldı.', 'Taraflar yeniden dinlendi.', 'Ek süre talep edildi.'], winProb: 0.63 },
  8:  { events: ['Belediye kayıtları incelendi.', 'Kadastro müdürlüğünden yazı istendi.', 'Bilirkişi heyeti toplandı.'],    winProb: 0.65 },
  9:  { events: ['Yargıtay 2. bozma kararı verdi.', 'Dosya alt mahkemeye gönderildi.', 'Son duruşmaya hazırlık.'],          winProb: 0.70 },
  10: { events: ['Karar duruşması yapıldı.', 'Hüküm açıklandı.', 'İlam kesinleşti.'],                                      winProb: 0.75 },
}

export const ARB_EVENT_POOL: Record<number, YearEventData> = {
  1: { events: ['Tahkim talebi iletildi.', 'Arabulucu atandı.', 'Taraflar görüşmeye çağrıldı.'],                 winProb: 0.60 },
  2: { events: ['Teknik değerlendirme tamamlandı.', 'Uzlaşı tutanağı imzalandı.', 'Karar açıklandı.'],           winProb: 0.68 },
}
