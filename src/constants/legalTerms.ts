import type { LegalTerm } from '../types'

export const LEGAL_TERMS: Record<string, LegalTerm> = {
  konkordato: {
    short: 'Konkordato',
    definition: 'Borçlunun mahkeme denetiminde alacaklılarıyla yaptığı ödeme anlaşması.',
    detail: 'TİK md. 285-309: Alacaklıların en az 2/3\'ünün onayıyla yapılan yapılandırma. Süreç 1-2 yıl sürer; alacakların önemli kısmı tahsil edilemeyebilir.',
    ref: 'TİK md. 285-309',
  },
  cezaiSart: {
    short: 'Cezai Şart',
    definition: 'Sözleşmeyi ihlal eden tarafın ödeyeceği önceden belirlenmiş tazminat.',
    detail: 'TBK md. 179-182. Smart Contract\'ta cezai şart otomatik icra edilir — mahkeme kararı gerekmez. Klasik sözleşmede tahsil için ayrıca dava açmanız gerekir.',
    ref: 'TBK md. 179-182',
  },
  forceMajeure: {
    short: 'Force Majeure',
    definition: 'Tarafların kontrolü dışındaki olaylar nedeniyle sözleşme yükümlülüğünden kurtulma.',
    detail: 'TBK md. 136. Oracle entegrasyonu ile force majeure koşulları zincir üstünde otomatik doğrulanabilir.',
    ref: 'TBK md. 136',
  },
  oracle: {
    short: 'Oracle',
    definition: 'Blockchain dışındaki gerçek dünya verisini akıllı sözleşmeye aktaran köprü.',
    detail: 'Döviz kuru, hava durumu, lojistik takip gibi verileri doğrulanabilir şekilde zincire taşır.',
    ref: 'Blockchain Hukuku',
  },
  temerrut: {
    short: 'Temerrüt',
    definition: 'Borçlunun vadesinde ifa etmediği durum; alacaklıya ek haklar doğurur.',
    detail: 'TBK md. 117. Temerrüt halinde yasal faiz işler (%9/yıl). Smart Contract\'ta temerrüt anında otomatik ceza kesilir.',
    ref: 'TBK md. 117',
  },
}
