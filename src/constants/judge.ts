export const JUDGE_NAME  = 'Hakim Bey'
export const JUDGE_EMOJI = '👨‍⚖️'

export const JUDGE_BY_YEAR: Record<number, string[]> = {
  1:  ['Dosyanızı inceledim. Dava resmen açılmıştır.', 'Taraflara tebligat gönderildi. Süreç başlıyor.'],
  2:  ['Bilirkişi atadım. Raporunu bekliyorum.', 'Karşı tarafın itirazı kayıt altına alındı.'],
  3:  ['Yetersiz delil var. Ek belge ibraz edin.', 'Yargıtay içtihatlarına bakılacak.'],
  4:  ['Tanık ifadeleri alındı. Değerlendirme aşamasındayım.', 'Ara karar verdim — süreç devam ediyor.'],
  5:  ['Uzlaşma önerim vardı. Reddettiniz. Pekâlâ.', 'İstinaf kararı geldi, inceliyorum.'],
  6:  ['Yeni bilirkişi atıyorum. Teknik rapor istiyorum.', 'Dosya eksikleri giderilmeli. Son uyarı.'],
  7:  ['Ben bu dosyayı yeni devraldım. Baştan okuyorum.', 'Tarafları yeniden dinleyeceğim. Sabır.'],
  8:  ['Kadastro belgeleriniz eksik. Müdürlükten yazı istedim.', 'Bilirkişi heyeti tekrar toplandı.'],
  9:  ['Son fırsatınız: uzlaşmak ister misiniz? … Hayır mı? Pekâlâ.', 'Dosya tamamlandı. Karar aşamasına geçiyorum.'],
  10: ['Kararımı açıklıyorum. Sessizlik lütfen.', 'Yılların emeği bu an için. Hüküm açıklanıyor.'],
}

export const JUDGE_INCONCLUSIVE: string[] = [
  'Yetersiz delil. Karar ertelendi.',
  'Kanıtlar belirsiz. Süre uzatılıyor.',
  'Her iki tarafın da argümanı zayıf görünüyor.',
  'Bu dava uzayacak. İkimiz de sabredeceğiz.',
  'Dosya yetersiz. Ek süre tanıyorum.',
]

export const JUDGE_WEAK: string[] = [
  'Dürüst olmak gerekirse davanız zayıf.',
  'Karşı tarafın delilleri daha güçlü.',
  'Avukatınızla tekrar görüşmenizi tavsiye ederim.',
]

export const JUDGE_STRONG: string[] = [
  'Kanıtlarınız güçlü. Süreç sizin lehinize ilerliyor.',
  'Deliller açık. Devam edelim.',
  'Hukuki durumunuz oldukça iyi görünüyor.',
]
