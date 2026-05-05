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
  forcedMethod?: 'smart' | 'classic'
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'import_crisis',
    title: 'İthalat Krizi',
    subtitle: 'Tedarikçi teslimattan kaçıyor',
    emoji: '🚢',
    context:
      'Çin\'li tedarikçiniz 500.000 TL değerinde elektronik malı teslim etmedi. Mahkeme süreci 3-5 yıl sürebilir, enflasyon alacağınızı eritiyor. Koşullu otomatik ifa sözleşmesi ile doğrulama mekanizması kullanılsaydı ne fark ederdi?',
    learningGoal:
      'Fırsatçı karşı taraflarda doğrulama mekanizmalı koşullu ifa sözleşmesinin mahkeme sürecine kıyasla gerçek maliyet farkını görün.',
    stat: 'Türkiye\'de ticari davaların %68\'i 3+ yıl sürüyor',
    botId: 'opportunist',
    params: { timeout: 15, penaltyRate: 20, useOracle: true },
  },
  {
    id: 'software_delivery',
    title: 'Yazılım Teslimatı',
    subtitle: 'Kod teslim edilmedi, bütçe harcandı',
    emoji: '💻',
    context:
      'Bir yazılım firması proje bedelini aldı ama kaynak kodu teslim etmedi. Klasik sözleşmede ispat yükü size ait; arbitraj seçeneğiniz var. Koşullu otomatik ifa sözleşmesinde milestonelar otomatik kilitlenebilirdi.',
    learningGoal:
      'Müteahhit tipli karşı taraflarda arbitraj ile koşullu ifa sözleşmesinin maliyet-zaman analizini karşılaştırın.',
    stat: 'Yazılım projelerinin %43\'ü sözleşme uyuşmazlığıyla sonuçlanıyor',
    botId: 'contractor',
    params: { timeout: 10, penaltyRate: 15, useOracle: false },
  },
  {
    id: 'construction_delay',
    title: 'İnşaat Gecikmesi',
    subtitle: 'Mücbir sebep mi, yoksa ihmal mi?',
    emoji: '🏗️',
    context:
      'İnşaat firması teslim tarihini 8 ay aştı ve mücbir sebep iddiasında bulunuyor. Dürüst bir karşı tarafla bile klasik sözleşme gecikme cezasını tahsil etmeyi zorlaştırıyor.',
    learningGoal:
      'Dürüst ama sözleşme ihlali yapan karşı taraflarda gecikme cezası mekanizmasını ve koşullu ifa sözleşmesinin avantajını anlayın.',
    stat: 'İnşaat davalarında ortalama tahsilat oranı %55',
    botId: 'honest',
    params: { timeout: 20, penaltyRate: 25, useOracle: true },
    forcedMethod: 'classic',
  },
]
