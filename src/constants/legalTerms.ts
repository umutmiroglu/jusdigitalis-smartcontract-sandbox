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
    detail: 'TBK md. 179-182. Koşullu otomatik ifa sözleşmesinde cezai şart otomatik icra edilir — mahkeme kararı gerekmez. Klasik sözleşmede tahsil için ayrıca dava açmanız gerekir.',
    ref: 'TBK md. 179-182',
  },
  forceMajeure: {
    short: 'Force Majeure',
    definition: 'Tarafların kontrolü dışındaki olaylar nedeniyle sözleşme yükümlülüğünden kurtulma.',
    detail: 'TBK md. 136. Doğrulama mekanizması ile force majeure koşulları bağımsız olarak otomatik teyit edilebilir.',
    ref: 'TBK md. 136',
  },
  dogrulamaMekanizmasi: {
    short: 'Doğrulama Mekanizması',
    definition: 'Sözleşme koşullarının tarafsız bir sistem tarafından otomatik olarak doğrulanması ve yerine getirilmesini sağlayan mekanizma.',
    detail: 'TBK md. 136. Koşulların otomatik doğrulanması force majeure anlaşmazlıklarını önler ve tahsilat sürecini hızlandırır.',
    ref: 'Borçlar Hukuku',
  },
  temerrut: {
    short: 'Temerrüt',
    definition: 'Borçlunun vadesinde ifa etmediği durum; alacaklıya ek haklar doğurur.',
    detail: 'TBK md. 117. Temerrüt halinde yasal faiz işler (%9/yıl). Koşullu otomatik ifa sözleşmesinde temerrüt anında otomatik ceza kesilir.',
    ref: 'TBK md. 117',
  },
}
