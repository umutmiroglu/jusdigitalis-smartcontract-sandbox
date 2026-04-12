// ════════════════════════════════════════════════════════════════════════════
// JUS DIGITALIS v2.5 — Sandbox & Analytics Edition
// "Boş Güven → Konkordato. Trustless Trust → Sermaye Koruması."
// Tüm v2.4 bug'ları düzeltildi + analytics + A/B test + yeni modüller
// ════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback, memo, Component } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   PART 1 — CONSTANTS, ANALYTICS, DATA, MATH UTILS, CSS
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const INITIAL_COINS        = 1000;
const ORACLE_FEE           = 30;
const COURT_FEE_RATE       = 0.05;
const ARBITRATION_FEE_RATE = 0.03;
const LEGAL_INTEREST_RATE  = 0.09;
const OPPORTUNITY_YIELD    = 0.25;
const MARKET_CRASH_PENALTY = 0.30;
const MARKET_CRASH_CYCLES  = 2;
const KONKORDATO_CHANCE    = 0.15;
const DOMINO_FAILURE_BUMP  = 0.20;
const DOMINO_RECOVERY      = 0.05;   // v2.5 fix: SC başarısında domino azalır
const MAX_TRUST_SCORE      = 100;
const TRUST_DISCOUNT_MAX   = 20;
const LS_KEY               = "jus_digitalis_v25";

const INFLATION_BY_YEAR = {
  1:0.82,2:0.68,3:0.52,4:0.44,5:0.38,
  6:0.33,7:0.29,8:0.25,9:0.22,10:0.18,
};
const MARKET_VARIANCE = {
  honest:      {base:0.12,variance:0.18},
  opportunist: {base:0.25,variance:0.40},
  contractor:  {base:0.10,variance:0.22},
};
const LAWSUIT_YEARS_BY_BOT     = {honest:3, opportunist:2, contractor:10};
const ARBITRATION_YEARS_BY_BOT = {honest:1, opportunist:1, contractor:2};

// ─── LEGAL TERMS DICTIONARY ─────────────────────────────────────────────────
const LEGAL_TERMS = {
  konkordato: {
    short:"Konkordato",
    definition:"Borçlunun mahkeme denetiminde alacaklılarıyla yaptığı ödeme anlaşması.",
    detail:"TİK md. 285-309: Alacaklıların en az 2/3'ünün onayıyla yapılan yapılandırma. Süreç 1-2 yıl sürer; alacakların önemli kısmı tahsil edilemeyebilir.",
    ref:"TİK md. 285-309",
  },
  cezaiSart: {
    short:"Cezai Şart",
    definition:"Sözleşmeyi ihlal eden tarafın ödeyeceği önceden belirlenmiş tazminat.",
    detail:"TBK md. 179-182. Smart Contract'ta cezai şart otomatik icra edilir — mahkeme kararı gerekmez. Klasik sözleşmede tahsil için ayrıca dava açmanız gerekir.",
    ref:"TBK md. 179-182",
  },
  forceMajeure: {
    short:"Force Majeure",
    definition:"Tarafların kontrolü dışındaki olaylar nedeniyle sözleşme yükümlülüğünden kurtulma.",
    detail:"TBK md. 136. Deprem, salgın, savaş gibi öngörülemeyen olaylar. Oracle entegrasyonu ile force majeure koşulları zincir üstünde otomatik doğrulanabilir.",
    ref:"TBK md. 136",
  },
  oracle: {
    short:"Oracle",
    definition:"Blockchain dışındaki gerçek dünya verisini akıllı sözleşmeye aktaran köprü.",
    detail:"Döviz kuru, hava durumu, lojistik takip gibi verileri doğrulanabilir şekilde zincire taşır. Force majeure tespitinde mahkeme yerine oracle kullanmak süreci yıllarca kısaltır.",
    ref:"Blockchain Hukuku",
  },
  temerrut: {
    short:"Temerrüt",
    definition:"Borçlunun vadesinde ifa etmediği durum; alacaklıya ek haklar doğurur.",
    detail:"TBK md. 117. Temerrüt halinde yasal faiz işler (%9/yıl), alacaklı sözleşmeden dönebilir. Smart Contract'ta temerrüt anında otomatik ceza kesilir — ispat yükü yoktur.",
    ref:"TBK md. 117",
  },
};

// ─── ANALYTICS ───────────────────────────────────────────────────────────────
const ANALYTICS_URL = "/api/sandbox-analytics";
let _aQueue = [];

(function loadOfflineQueue() {
  try {
    const raw = localStorage.getItem("jd_aq");
    if (raw) { _aQueue = JSON.parse(raw); _flush(); }
  } catch {}
})();

function _flush() {
  if (!_aQueue.length) return;
  const batch = [..._aQueue];
  _aQueue = [];
  try { localStorage.removeItem("jd_aq"); } catch {}
  fetch(ANALYTICS_URL, {
    method:"POST", headers:{"Content-Type":"application/json"},
    keepalive:true, body:JSON.stringify({events:batch}),
  }).catch(() => {
    _aQueue = [...batch, ..._aQueue];
    try { localStorage.setItem("jd_aq", JSON.stringify(_aQueue)); } catch {}
  });
}

function track(eventName, data={}) {
  _aQueue.push({event:eventName, ts:Date.now(), ...data});
  try { localStorage.setItem("jd_aq", JSON.stringify(_aQueue)); } catch {}
  _flush();
}

// ─── A/B TEST ─────────────────────────────────────────────────────────────
function getABVariant() {
  try { const v = localStorage.getItem("jd_ab"); if (v) return v; } catch {}
  const variants = ["forceClassicFirst","freeChoice","aiAdvisorProminent"];
  const v = variants[Math.floor(Math.random() * 3)];
  try { localStorage.setItem("jd_ab", v); } catch {}
  return v;
}

// ─── PERSISTENCE ─────────────────────────────────────────────────────────────
function loadPersisted() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; }
}
function savePersisted(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

// ─── BOT DATA ────────────────────────────────────────────────────────────────
const BOTS = [
  {
    id:"honest", name:"Dürüst Satıcı", title:"Güvenilir Tüccar",
    emoji:"🤝", color:"#00d4aa", colorRgb:"0,212,170",
    risk:"Düşük Risk", riskColor:"#00d4aa",
    basePrice:200, baseReward:240, baseSuccessRate:0.82, delay:1800,
    catchphrase:"Söz verdiysem yerine getiririm.",
    description:"Niyeti dürüst, kâr marjı düşük. Piyasa şokları onu da sarsar.",
    riskTolerance:0.9, priceFlexibility:0.05, failureType:"force_majeure",
    dialogues:{
      greet:  ["Biz yaşlı adamız, ne anlarız bu smart contract denen şeyden…","Evlat, ben sözümün eri bir adamım."],
      smart:  ["Smart contract mı? Tamam tamam, imzalıyorum.","Bilgisayarlar benim yerime mi konuşacak şimdi?"],
      success:["Gördün mü? Söz verdiysem yerine getiririm.","İşte bu. Ticaret böyle yapılır."],
      fail:   ["Allah'ım, ben de bilmiyordum…","Çocuk, bu benim elimde değildi."],
    },
  },
  {
    id:"opportunist", name:"Fırsatçı Freelancer", title:"Bağımsız Ajan",
    emoji:"🦊", color:"#ff6b35", colorRgb:"255,107,53",
    risk:"Yüksek Risk", riskColor:"#ff4444",
    basePrice:150, baseReward:420, baseSuccessRate:0.22, delay:2800,
    catchphrase:"Fiyat uygunsa… görüşürüz.",
    description:"Sözleşmede açık bulursa teslim etmez. Başardığında kâr yüksek.",
    riskTolerance:0.3, priceFlexibility:0.25, failureType:"fraud",
    dialogues:{
      greet:  ["Para peşin, teslimat… zaman içinde olur.","Sözleşmeye bak, her şey yazıyor."],
      smart:  ["Smart contract ha? Yani para kasaya giriyor, teslim etmesem iade ediliyor… ilginç.","Şartlar çok sert ama bakabiliriz."],
      success:["Görüyor musun? Ben de teslim ederim. Her zaman değil ama… bazen.","Bugün şanslı günündü."],
      fail:   ["Teknik sorunlar çıktı. Anlarsın.","Sözleşmede 'makul süre' diyordu. Ben de makul buldum."],
    },
  },
  {
    id:"contractor", name:"Uzman Müteahhit", title:"İnşaat & Proje Yöneticisi",
    emoji:"🏗️", color:"#3b82f6", colorRgb:"59,130,246",
    risk:"Orta Risk", riskColor:"#f39c12",
    basePrice:300, baseReward:370, baseSuccessRate:0.58, delay:2400,
    catchphrase:"Proje teslim edilir — ama inşaat gecikir, bu kanundur.",
    description:"Büyük işler alır. Teslim etse de piyasa kârı eritiyor. Davası 10 yıl sürer.",
    riskTolerance:0.5, priceFlexibility:0.15, failureType:"delay",
    dialogues:{
      greet:  ["Taşınmaz işi budur, her şey kademeli ilerler.","Projemiz hazır, ruhsatlar tamam."],
      smart:  ["Smart contract, taşınmazlarda mı? İlginç.","Yani ruhsat gecikmesi de ceza kapsamında mı?"],
      success:["Proje teslim. Biraz geciktik ama teslim ettik.","İnşaat böyle bir şeydir."],
      fail:   ["Belediye ruhsatı vermedi. Bizim elimizde değil.","Malzeme fiyatları üç katına çıktı."],
    },
  },
];

// ─── LAWYER DATA ─────────────────────────────────────────────────────────────
const LAWYERS = [
  {
    id:"rookie", name:"Stajyer Avukat", title:"Az Tecrübeli · Az Ücretli",
    emoji:"👨‍🎓", color:"#a0aec0", fee:30, winMultiplier:0.28, recoveryRate:0.35,
    description:"Yeni mezun, hevesli ama deneyimsiz.",
    dialogues:["Bu davayı kazanabilirim! Hukuk fakültesinde birinci oldum.","Şimdi şöyle bir strateji düşündüm… bekleyin not alıyorum.","Daha önce böyle bir dava görmedim ama araştırırım!"],
  },
  {
    id:"mid", name:"Genç Ortak", title:"Orta Tecrübe · Orta Ücret",
    emoji:"👩‍💼", color:"#f39c12", fee:70, winMultiplier:0.52, recoveryRate:0.55,
    description:"3–5 yıllık deneyim. Hevesli ve konuşkan.",
    dialogues:["Yargıtay içtihatlarına göre aynen bu durumu kapsıyor!","Müvekkilim haklı! Ve ben bunu ispat edeceğim.","Bu davayı %80 kazanırız. Ya da %60. Şartlara göre değişiyor."],
  },
  {
    id:"veteran", name:"Kurt Avukat", title:"Tecrübeli · Pahalı · Az Konuşur",
    emoji:"⚖️", color:"#9b59b6", fee:140, winMultiplier:0.78, recoveryRate:0.72,
    description:"25 yıllık deneyim. Pahalı ama kazanır.",
    dialogues:["Tamam.","Dosyayı inceledim. Kazanırız.","Karşı taraf zayıf.","Güvenin bana."],
  },
];

// ─── SCENARIO DATA ───────────────────────────────────────────────────────────
const SCENARIOS = [
  {
    id:"ithalat",
    title:"İthalat Krizi 2024",
    subtitle:"Döviz Kuru Şoku",
    description:"Dolar/TL ani %40 yükseldi. Tedarikçiniz ödeme alamadığını söylüyor. Piyasa krizi aktif.",
    emoji:"📉",
    botId:"opportunist",
    forceCrash:true,
    context:"Bu senaryoda döviz kuru şoku nedeniyle her iki taraf da zor durumda. Smart Contract oracle entegrasyonu gerçek kur verisini doğrular.",
    learningGoal:"Force majeure koşullarında oracle tabanlı SC'nin manuel müzakereye karşı avantajını öğrenin.",
    stat:"2024'te döviz krizlerinde klasik sözleşme uyuşmazlıklarının %67'si çözümsüz kaldı.",
  },
  {
    id:"yazilim",
    title:"Yazılım Projesi Teslimatı",
    subtitle:"Freelancer · Milestone",
    description:"Bağımsız geliştirici 3 milestone'u teslim etmedi. İspatlama güçlüğü var.",
    emoji:"💻",
    botId:"opportunist",
    forceCrash:false,
    context:"Yazılım projelerinde teslimatın 'tamamlanma' kriteri muğlak kalır. SC, her milestone'u on-chain doğrular.",
    learningGoal:"Dijital hizmet sözleşmelerinde ispat yükünün neden hayati olduğunu görün.",
    stat:"Yazılım uyuşmazlıklarının %43'ü ispat yetersizliği nedeniyle reddedilir.",
  },
  {
    id:"insaat",
    title:"İnşaat Gecikme Davası",
    subtitle:"Müteahhit · 10 Yıllık Süreç",
    description:"Müteahhit 18 ay gecikti. Mahkeme süreci başlıyor.",
    emoji:"🏗️",
    botId:"contractor",
    forceCrash:false,
    context:"İnşaat davalarında bilirkişi, kadastro, belediye yazışmaları ile ortalama süreç 8-12 yıl.",
    learningGoal:"Zaman değeri kaybını ve fırsat maliyetini somut olarak hesaplayın.",
    stat:"Türkiye'de inşaat davalarının ortalama süresi 7.4 yıl (2023 Yargı İstatistikleri).",
  },
];

// ─── YEAR EVENTS ─────────────────────────────────────────────────────────────
const YEAR_EVENT_POOL = {
  1:{events:["Dilekçeler mahkemeye sunuldu.","Tebligatlar gönderildi.","İlk duruşma tarihi belirlendi."],winProb:0.35},
  2:{events:["Bilirkişi atandı.","Bilirkişi raporu hazırlandı.","Karşı taraf rapora itiraz etti."],winProb:0.42},
  3:{events:["Yargıtay'a taşındı.","Yargıtay bozma kararı verdi.","Yeniden yargılama başladı."],winProb:0.50},
  4:{events:["Keşif yapıldı.","Tanıklar dinlendi.","Ara karar verildi."],winProb:0.55},
  5:{events:["Uzlaşma görüşmeleri başarısız.","İstinaf mahkemesine gidildi.","İstinaf kararı bekleniyor."],winProb:0.58},
  6:{events:["Mahkeme dosyası tekrar incelendi.","Yeni bilirkişi atandı.","Teknik rapor istendi."],winProb:0.61},
  7:{events:["Hâkim değişikliği nedeniyle dosya yeniden açıldı.","Taraflar yeniden dinlendi.","Ek süre talep edildi."],winProb:0.63},
  8:{events:["Belediye kayıtları incelendi.","Kadastro müdürlüğünden yazı istendi.","Bilirkişi heyeti toplandı."],winProb:0.65},
  9:{events:["Yargıtay 2. bozma kararı verdi.","Dosya alt mahkemeye gönderildi.","Son duruşmaya hazırlık."],winProb:0.70},
  10:{events:["Karar duruşması yapıldı.","Hüküm açıklandı.","İlam kesinleşti."],winProb:0.75},
};
const ARB_EVENT_POOL = {
  1:{events:["Tahkim talebi iletildi.","Arabulucu atandı.","Taraflar görüşmeye çağrıldı."],winProb:0.60},
  2:{events:["Teknik değerlendirme tamamlandı.","Uzlaşı tutanağı imzalandı.","Karar açıklandı."],winProb:0.68},
};

function buildYearEvents(n, isArb=false) {
  const pool = isArb ? ARB_EVENT_POOL : YEAR_EVENT_POOL;
  return Array.from({length:n},(_,i)=>{
    const y=i+1; const d=pool[y]||pool[3];
    return {year:y, label:`${y}. YIL`, events:d.events, winProb:d.winProb};
  });
}

// ─── MATH & ECONOMICS ────────────────────────────────────────────────────────
function genContractId(){
  return "JD-"+Math.random().toString(36).toUpperCase().slice(2,8)+"-"+Date.now().toString(36).toUpperCase().slice(-4);
}
function nowStr(){return new Date().toLocaleString("tr-TR");}
function pickRandom(arr){return arr[Math.floor(Math.random()*arr.length)];}

function computeDynamicReward(bot, crashActive) {
  const mv = MARKET_VARIANCE[bot.id]||{base:0.15,variance:0.20};
  let marketMod = (Math.random()-0.4)*mv.variance;
  if (crashActive) marketMod -= 0.08;
  const profitRate = Math.max(0.02, mv.base+marketMod);
  const reward = Math.round(bot.basePrice*(1+profitRate));
  const delta = reward-bot.basePrice;
  const marketNote = marketMod>0.05?"Piyasa lehte":marketMod<-0.05?"Piyasa aleyhte":"";
  return {reward, delta, marketNote, profitRate};
}

// v2.5 fix: effectivePenalty computed separately; used in all downstream calcs
function botEvaluateContract(bot, params, trustScore=50) {
  const discount = Math.floor((trustScore/MAX_TRUST_SCORE)*TRUST_DISCOUNT_MAX);
  const effectivePenalty = Math.max(0, params.penaltyRate-discount);
  const harshness = (1-params.timeout/60)*0.5+(effectivePenalty/100)*0.5;
  if (harshness > bot.riskTolerance+0.4)
    return {refused:true,priceMultiplier:1,reason:"Şartlar çok sert — bot reddetti.",discount,effectivePenalty};
  if (harshness > bot.riskTolerance) {
    const bump = 1+bot.priceFlexibility+(harshness-bot.riskTolerance)*0.5;
    return {refused:false,priceMultiplier:parseFloat(bump.toFixed(2)),reason:`Bot sert şartlar için %${Math.round((bump-1)*100)} zam istedi.`,discount,effectivePenalty};
  }
  return {refused:false,priceMultiplier:1,reason:null,discount,effectivePenalty};
}

function computeSuccessRate(bot, params, crashActive, dominoBump=0) {
  let rate = bot.baseSuccessRate;
  if (params.useOracle) rate = Math.min(rate+0.35, 0.97);
  if (bot.id==="opportunist" && params.timeout<15) rate = Math.max(rate-0.08, 0);
  if (crashActive) rate = Math.max(rate-MARKET_CRASH_PENALTY, 0.02);
  rate = Math.max(rate-dominoBump, 0.02);
  return rate;
}

function computeCourtFee(basePrice){return Math.round(basePrice*COURT_FEE_RATE);}
function computeArbitrationFee(basePrice){return Math.round(basePrice*ARBITRATION_FEE_RATE);}

// v2.5 fix: always receives basePrice explicitly, never inflationLoss
function computeAutopsy(method, bot, totalYears, won) {
  const basePrice = bot.basePrice;
  const courtFee  = computeCourtFee(basePrice);            // BUG FIX: was computeCourtFee(inflationLoss)
  const inflMult  = INFLATION_BY_YEAR[Math.max(1,Math.min(totalYears,10))]||0.18;
  const inflationLoss = Math.floor(basePrice*(1-inflMult));
  const legalInterest = won ? Math.floor(basePrice*inflMult*(Math.pow(1+LEGAL_INTEREST_RATE,totalYears)-1)) : 0;
  const opportunityCost = Math.floor(basePrice*(Math.pow(1+OPPORTUNITY_YIELD,Math.max(totalYears,1))-1));
  const konkordatoRisk  = Math.round(KONKORDATO_CHANCE*100);
  return {
    method, courtFee, inflationLoss, legalInterest, opportunityCost, konkordatoRisk,
    scSaving: method!=="smart" ? (inflationLoss+courtFee) : 0,
    totalClassicLoss: courtFee+inflationLoss+opportunityCost,
    summary: method==="smart"
      ? `Smart Contract seçerek ${courtFee} JC harç + %${Math.round((1-inflMult)*100)} enflasyon kaybından + %${konkordatoRisk} konkordato riskinden korunuştunuz.`
      : `Klasik yöntem: ${courtFee} JC harç + ${inflationLoss} JC enflasyon kaybı + ${opportunityCost} JC fırsat maliyeti oluştu.`,
  };
}

// Loss aversion: convert JusCoin to work hours
function computeOpportunityCostHuman(jusCoin) {
  const hourlyRate = 12; // JusCoin/saat (temsili)
  const hours = Math.round(jusCoin/hourlyRate);
  const weeks = (hours/40).toFixed(1);
  return {hours, weeks};
}

// ─── TRUST / REPUTATION ──────────────────────────────────────────────────────
function initTrustScores(){return Object.fromEntries(BOTS.map(b=>[b.id,50]));}

function applyTrustUpdate(scores, botId, event) {
  const delta = {sc_success:+8, sc_fail:-5, classic_success:+3, lawsuit:-10, arbitration_win:+2}[event]||0;
  return {...scores, [botId]:Math.max(0,Math.min(MAX_TRUST_SCORE,(scores[botId]||50)+delta))};
}

function getReputationBadge(score) {
  if (score>=80) return {label:"Güvenilir",color:"#00d4aa"};
  if (score>=60) return {label:"Orta",color:"#f39c12"};
  if (score>=40) return {label:"Şüpheli",color:"#ff6b35"};
  return {label:"Riskli",color:"#ff4444"};
}

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Barlow+Condensed:wght@400;600;700;800;900&family=Syne:wght@400;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Syne',sans-serif;background:#060a10;color:#e2e8f0;}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
@keyframes fadeUp{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-40px)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes countUp{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}
@keyframes receiptIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes bubbleIn{from{opacity:0;transform:scale(.8) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes lawyerPop{from{opacity:0;transform:translateY(20px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes lockPulse{0%,100%{box-shadow:0 0 20px rgba(0,212,170,.3)}50%{box-shadow:0 0 50px rgba(0,212,170,.7)}}
@keyframes konkordatoFlash{0%,100%{background:rgba(255,68,68,.0)}50%{background:rgba(255,68,68,.15)}}
@keyframes winProbGrow{from{width:0}to{width:var(--wp)}}
@keyframes slideIn{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
@keyframes refundPop{0%{opacity:0;transform:scale(0.6)}60%{transform:scale(1.15)}100%{opacity:1;transform:scale(1)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
input[type=range]{-webkit-appearance:none;appearance:none;height:4px;border-radius:2px;background:rgba(255,255,255,.1);width:100%;cursor:pointer;}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#00d4aa;cursor:pointer;box-shadow:0 0 8px rgba(0,212,170,.5);}
::-webkit-scrollbar{width:4px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:rgba(0,212,170,.3);border-radius:2px;}
.tooltip-wrap{position:relative;display:inline-flex;align-items:center;cursor:help;}
.tooltip-wrap .tooltip-box{display:none;position:absolute;bottom:calc(100%+6px);left:50%;transform:translateX(-50%);background:#0d1b2a;border:1px solid rgba(0,212,170,.3);color:#cce;font-size:11px;line-height:1.6;padding:8px 12px;border-radius:8px;width:240px;z-index:999;pointer-events:none;}
.tooltip-wrap:hover .tooltip-box{display:block;animation:bubbleIn .2s ease-out;}
`;

/* ═══════════════════════════════════════════════════════════════════════════
   PART 2 — ERROR BOUNDARY, UI ATOMS, BOT CARD, LAWYER SELECT, TIME TUNNEL
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
class JusErrorBoundary extends Component {
  constructor(props) { super(props); this.state={hasError:false,errorMsg:""}; }
  static getDerivedStateFromError(err){ return {hasError:true,errorMsg:err?.message||"Bilinmeyen hata"}; }
  componentDidCatch(err,info){ track("ERROR",{message:err?.message,stack:info?.componentStack?.slice(0,200)}); }
  handleReset() {
    try{ localStorage.removeItem(LS_KEY); }catch{}
    window.location.reload();
  }
  render(){
    if(!this.state.hasError) return this.props.children;
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#060a10",flexDirection:"column",gap:24,padding:32}}>
        <div style={{fontSize:48}}>⚠️</div>
        <div style={{fontFamily:"'Space Mono',monospace",color:"#ff4444",fontSize:14,textAlign:"center"}}>
          Sistem Hatası<br/><span style={{color:"#666",fontSize:11}}>{this.state.errorMsg}</span>
        </div>
        <button onClick={()=>this.handleReset()} style={{padding:"12px 28px",background:"#00d4aa",color:"#060a10",border:"none",borderRadius:8,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer"}}>
          Sıfırla ve Yeniden Başla
        </button>
      </div>
    );
  }
}

// ─── COIN DISPLAY (memo + animation queue — v2.5 bug fix #4) ─────────────────
const CoinDisplay = memo(function CoinDisplay({coins}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(0,212,170,.1)",border:"1px solid rgba(0,212,170,.3)",borderRadius:12,padding:"8px 16px"}}>
      <span style={{fontSize:18}}>🪙</span>
      <span style={{fontFamily:"'Space Mono',monospace",color:"#00d4aa",fontWeight:700,fontSize:18,letterSpacing:1}}>
        {coins.toLocaleString("tr-TR")}
      </span>
      <span style={{color:"#4a5568",fontSize:11}}>JC</span>
    </div>
  );
});

// ─── LEGAL TERM TOOLTIP ──────────────────────────────────────────────────────
function LegalTermTooltip({termKey, children}) {
  const [showModal, setShowModal] = useState(false);
  const term = LEGAL_TERMS[termKey];
  if (!term) return <>{children}</>;
  return (
    <>
      <span className="tooltip-wrap" style={{borderBottom:"1px dashed rgba(0,212,170,.4)",color:"#00d4aa",cursor:"help"}}>
        {children||term.short}
        <span className="tooltip-box">
          <strong style={{display:"block",marginBottom:4}}>{term.short}</strong>
          {term.definition}
          <br/>
          <span style={{color:"rgba(0,212,170,.6)",fontSize:10}}>{term.ref}</span>
          <br/>
          <span style={{color:"#00d4aa",fontSize:10,cursor:"pointer",textDecoration:"underline"}} onClick={e=>{e.stopPropagation();setShowModal(true);}}>
            Daha fazla bilgi →
          </span>
        </span>
      </span>
      {showModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={()=>setShowModal(false)}>
          <div style={{background:"#0d1b2a",border:"1px solid rgba(0,212,170,.4)",borderRadius:16,padding:32,maxWidth:480,width:"100%"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Space Mono',monospace",color:"#00d4aa",fontSize:12,marginBottom:8}}>{term.ref}</div>
            <h3 style={{color:"#e2e8f0",marginBottom:16,fontSize:20}}>{term.short}</h3>
            <p style={{color:"#a0aec0",lineHeight:1.7,fontSize:14}}>{term.detail}</p>
            <button onClick={()=>setShowModal(false)} style={{marginTop:20,padding:"8px 20px",background:"rgba(0,212,170,.15)",border:"1px solid rgba(0,212,170,.4)",color:"#00d4aa",borderRadius:8,cursor:"pointer",fontFamily:"'Syne',sans-serif",fontSize:13}}>Kapat</button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── BOT CARD (React.memo) ────────────────────────────────────────────────────
const BotCard = memo(function BotCard({bot, trustScore, selected, onSelect, disabled, timeOnCard}) {
  const badge = getReputationBadge(trustScore);
  const discount = Math.floor((trustScore/MAX_TRUST_SCORE)*TRUST_DISCOUNT_MAX);
  return (
    <div
      onClick={()=>!disabled && onSelect(bot)}
      style={{
        border:`2px solid ${selected?"rgba("+bot.colorRgb+",.8)":"rgba("+bot.colorRgb+",.2)"}`,
        borderRadius:16, padding:24, cursor:disabled?"not-allowed":"pointer",
        background:selected?`rgba(${bot.colorRgb},.08)`:"rgba(255,255,255,.02)",
        transition:"all .2s", opacity:disabled?.5:1,
        transform:selected?"scale(1.02)":"scale(1)",
        position:"relative", overflow:"hidden",
      }}
    >
      {selected && <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,rgba(${bot.colorRgb},1),transparent)`}}/>}
      <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:12}}>
        <span style={{fontSize:32,animation:"float 3s ease-in-out infinite"}}>{bot.emoji}</span>
        <div style={{flex:1}}>
          <div style={{color:"#e2e8f0",fontWeight:700,fontSize:16}}>{bot.name}</div>
          <div style={{color:"#718096",fontSize:11,marginTop:2}}>{bot.title}</div>
          <div style={{marginTop:6,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{background:`rgba(${bot.colorRgb},.15)`,color:bot.riskColor,fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600}}>{bot.risk}</span>
            <span style={{background:`rgba(255,255,255,.05)`,color:badge.color,fontSize:10,padding:"2px 8px",borderRadius:20}}>
              Güven {trustScore}/100
            </span>
            {discount>0 && <span style={{background:"rgba(0,212,170,.1)",color:"#00d4aa",fontSize:10,padding:"2px 8px",borderRadius:20}}>-{discount}% indirim</span>}
          </div>
        </div>
      </div>
      <p style={{color:"#718096",fontSize:12,lineHeight:1.6,marginBottom:12}}>{bot.description}</p>
      <div style={{fontFamily:"'Space Mono',monospace",color:"rgba("+bot.colorRgb+",.7)",fontSize:11,fontStyle:"italic"}}>"{bot.catchphrase}"</div>
      <div style={{display:"flex",gap:16,marginTop:12,paddingTop:12,borderTop:"1px solid rgba(255,255,255,.06)"}}>
        <div style={{textAlign:"center"}}>
          <div style={{color:"#e2e8f0",fontWeight:700,fontFamily:"'Space Mono',monospace"}}>{bot.basePrice} JC</div>
          <div style={{color:"#4a5568",fontSize:10}}>Ödeme</div>
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{color:"#00d4aa",fontWeight:700,fontFamily:"'Space Mono',monospace"}}>{bot.baseReward} JC</div>
          <div style={{color:"#4a5568",fontSize:10}}>Beklenen Kazanç</div>
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{color:bot.baseSuccessRate>0.6?"#00d4aa":bot.baseSuccessRate>0.4?"#f39c12":"#ff4444",fontWeight:700,fontFamily:"'Space Mono',monospace"}}>
            %{Math.round(bot.baseSuccessRate*100)}
          </div>
          <div style={{color:"#4a5568",fontSize:10}}>Başarı</div>
        </div>
      </div>
    </div>
  );
});

// ─── LAWYER SELECT ────────────────────────────────────────────────────────────
function LawyerSelect({bot, onSelect, onArbitration}) {
  const [chosen, setChosen] = useState(null);
  const [mode, setMode] = useState("lawsuit"); // lawsuit | arbitration

  const isArb = mode==="arbitration";
  const years = isArb ? ARBITRATION_YEARS_BY_BOT[bot.id] : LAWSUIT_YEARS_BY_BOT[bot.id];
  const baseFee = isArb ? computeArbitrationFee(bot.basePrice) : computeCourtFee(bot.basePrice);

  return (
    <div style={{animation:"lawyerPop .4s ease-out"}}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:40,marginBottom:8}}>⚖️</div>
        <h3 style={{color:"#e2e8f0",fontSize:20,marginBottom:4}}>Hukuki Temsil Seçin</h3>
        <p style={{color:"#718096",fontSize:13}}>
          Mahkeme harcı: <strong style={{color:"#ff4444"}}>{baseFee} JC</strong> anında kesilecek.
          Dava süreci: <strong style={{color:"#f39c12"}}>{years} yıl</strong>
        </p>
      </div>

      {/* Lawsuit vs Arbitration toggle */}
      <div style={{display:"flex",gap:8,marginBottom:20,background:"rgba(255,255,255,.03)",borderRadius:12,padding:6}}>
        {["lawsuit","arbitration"].map(m=>(
          <button key={m} onClick={()=>setMode(m)} style={{
            flex:1,padding:"10px 0",border:"none",borderRadius:8,cursor:"pointer",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,
            background:mode===m?"rgba(0,212,170,.15)":"transparent",
            color:mode===m?"#00d4aa":"#718096",transition:"all .2s",
          }}>
            {m==="lawsuit"?"Mahkeme Davası":"Tahkim / Arabulucu"}
          </button>
        ))}
      </div>

      <div style={{display:"grid",gap:12,marginBottom:20}}>
        {LAWYERS.map(l=>(
          <div key={l.id} onClick={()=>setChosen(l)} style={{
            border:`2px solid ${chosen?.id===l.id?"rgba(0,212,170,.6)":"rgba(255,255,255,.06)"}`,
            borderRadius:12, padding:16, cursor:"pointer",
            background:chosen?.id===l.id?"rgba(0,212,170,.05)":"rgba(255,255,255,.02)",
            display:"flex",alignItems:"center",gap:16,transition:"all .2s",
          }}>
            <span style={{fontSize:28}}>{l.emoji}</span>
            <div style={{flex:1}}>
              <div style={{color:"#e2e8f0",fontWeight:700}}>{l.name}</div>
              <div style={{color:"#718096",fontSize:11}}>{l.title}</div>
              <div style={{color:"#a0aec0",fontSize:12,marginTop:4,fontStyle:"italic"}}>"{pickRandom(l.dialogues)}"</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{color:"#ff6b35",fontFamily:"'Space Mono',monospace",fontWeight:700}}>{l.fee} JC</div>
              <div style={{color:"#4a5568",fontSize:10}}>Avukat ücreti</div>
              <div style={{color:"#00d4aa",fontSize:11,marginTop:4}}>Kazanma: %{Math.round(l.winMultiplier*100)}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{background:"rgba(255,68,68,.06)",border:"1px solid rgba(255,68,68,.2)",borderRadius:10,padding:14,marginBottom:20,fontSize:13,color:"#fc8181"}}>
        ⏳ Uyarı: <LegalTermTooltip termKey="temerrut">Temerrüt</LegalTermTooltip> tarihinizden itibaren paranızın gerçek değeri her yıl erir.
        {years} yıl sonunda alacağınız paranın değeri şimdikinin yalnızca <strong>%{Math.round((INFLATION_BY_YEAR[years]||0.2)*100)}'i</strong> olacak.
      </div>

      <button
        disabled={!chosen}
        onClick={()=>onSelect(chosen, mode)}
        style={{
          width:"100%",padding:"14px 0",border:"none",borderRadius:10,cursor:chosen?"pointer":"not-allowed",
          background:chosen?"linear-gradient(135deg,#ff6b35,#ff4444)":"rgba(255,255,255,.1)",
          color:chosen?"#fff":"#4a5568",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,
          transition:"all .2s",
        }}
      >
        {chosen ? `${chosen.name} ile Davayı Başlat — ${baseFee+chosen.fee} JC` : "Avukat Seçin"}
      </button>
    </div>
  );
}

// ─── TIME TUNNEL ─────────────────────────────────────────────────────────────
function TimeTunnel({bot, lawyer, mode, isArb, onComplete}) {
  const totalYears = isArb ? ARBITRATION_YEARS_BY_BOT[bot.id] : LAWSUIT_YEARS_BY_BOT[bot.id];
  const yearEvents = buildYearEvents(totalYears, isArb);
  const [currentYear, setCurrentYear] = useState(0);
  const [log, setLog] = useState([]);
  const [done, setDone] = useState(false);
  const [finalWon, setFinalWon] = useState(false);
  const [konkordato, setKonkordato] = useState(false);

  useEffect(()=>{
    if (currentYear>=totalYears) {
      const lastWinProb = yearEvents[totalYears-1]?.winProb||0.5;
      const adjustedWinProb = lastWinProb * lawyer.winMultiplier;
      const won = Math.random() < adjustedWinProb;
      const konk = !won && Math.random() < KONKORDATO_CHANCE;
      setFinalWon(won);
      setKonkordato(konk);
      setDone(true);
      return;
    }
    const timer = setTimeout(()=>{
      const ev = yearEvents[currentYear];
      const event = pickRandom(ev.events);
      setLog(l=>[...l, {year:ev.year, text:event}]);
      setCurrentYear(y=>y+1);
    }, 900);
    return ()=>clearTimeout(timer);
  },[currentYear]);

  if (done) {
    return (
      <div style={{textAlign:"center",animation:"countUp .5s ease-out"}}>
        <div style={{fontSize:60,marginBottom:12}}>{finalWon?"🏆":konkordato?"💀":"😔"}</div>
        <h3 style={{color:finalWon?"#00d4aa":konkordato?"#ff4444":"#f39c12",fontSize:22,marginBottom:8}}>
          {finalWon?"Dava Kazanıldı":konkordato?"Konkordato İlan Edildi":"Dava Kaybedildi"}
        </h3>
        {konkordato && (
          <p style={{color:"#fc8181",fontSize:13,marginBottom:16}}>
            <LegalTermTooltip termKey="konkordato">Konkordato</LegalTermTooltip>: karşı taraf mahkeme korumasına girdi. Alacağınız belirsiz.
          </p>
        )}
        <p style={{color:"#718096",fontSize:13,marginBottom:24}}>
          {totalYears} yıl sonra paranızın değeri: <strong style={{color:"#f39c12"}}>%{Math.round((INFLATION_BY_YEAR[totalYears]||0.2)*100)}</strong>
        </p>
        <button onClick={()=>onComplete({won:finalWon, konkordato, totalYears, isArb})}
          style={{padding:"12px 32px",background:finalWon?"linear-gradient(135deg,#00d4aa,#0099ff)":"rgba(255,255,255,.1)",border:"none",borderRadius:10,color:finalWon?"#060a10":"#e2e8f0",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer"}}>
          Sonucu Gör →
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{color:"#718096",fontSize:12,marginBottom:8,fontFamily:"'Space Mono',monospace"}}>
          ZAMAN TÜNELİ — {isArb?"TAHKİM":"MAHKEME"} SÜRECİ
        </div>
        <div style={{color:"#e2e8f0",fontSize:18,fontWeight:700}}>
          {currentYear}/{totalYears}. Yıl
        </div>
        <div style={{height:4,background:"rgba(255,255,255,.1)",borderRadius:2,marginTop:12,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(currentYear/totalYears)*100}%`,background:"linear-gradient(90deg,#ff6b35,#ff4444)",transition:"width .8s ease",borderRadius:2}}/>
        </div>
      </div>
      <div style={{maxHeight:280,overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
        {log.map((entry,i)=>(
          <div key={i} style={{
            background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",
            borderRadius:10,padding:"10px 14px",animation:"slideIn .3s ease-out",
            display:"flex",gap:12,alignItems:"flex-start",
          }}>
            <span style={{color:"#f39c12",fontFamily:"'Space Mono',monospace",fontSize:11,whiteSpace:"nowrap",flexShrink:0}}>{entry.year}. YIL</span>
            <span style={{color:"#a0aec0",fontSize:13}}>{entry.text}</span>
          </div>
        ))}
        {currentYear<totalYears && (
          <div style={{textAlign:"center",padding:16,color:"#4a5568",fontSize:12}}>
            <div style={{display:"inline-block",width:16,height:16,border:"2px solid #00d4aa",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite",marginBottom:8}}/>
            <div>Duruşma bekleniyor…</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PART 3 — ECONOMIC AUTOPSY, LEGAL RECEIPT, CONTRACT MODAL
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── ECONOMIC AUTOPSY (v2.5: basePrice fix applied) ──────────────────────────
function EconomicAutopsy({autopsy, bot, method, onDone, sessionDurationMs}) {
  const [viewed, setViewed] = useState(false);
  useEffect(()=>{
    const t = setTimeout(()=>setViewed(true),2000);
    return ()=>clearTimeout(t);
  },[]);

  const humanCost = computeOpportunityCostHuman(autopsy.opportunityCost);
  const scAdvantageRealized = method!=="smart" && autopsy.scSaving>0;

  useEffect(()=>{
    if (viewed) track("COMPARISON_VIEW",{viewedAfterOutcome:true,timeSpentOnAutopsyMs:sessionDurationMs,scAdvantageRealized});
  },[viewed]);

  const Row = ({label,value,color="#e2e8f0",note})=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
      <span style={{color:"#718096",fontSize:13}}>{label}</span>
      <div style={{textAlign:"right"}}>
        <span style={{color,fontFamily:"'Space Mono',monospace",fontWeight:700}}>{value}</span>
        {note && <div style={{color:"#4a5568",fontSize:10}}>{note}</div>}
      </div>
    </div>
  );

  return (
    <div style={{animation:"receiptIn .5s ease-out"}}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:40,marginBottom:8}}>🔬</div>
        <h3 style={{color:"#e2e8f0",fontSize:22,marginBottom:4}}>Ekonomik Otopsi</h3>
        <p style={{color:"#718096",fontSize:13}}>Sözleşme gerçekten ne kadara mal oldu?</p>
      </div>

      {/* Side-by-side comparison */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        <div style={{background:method==="smart"?"rgba(0,212,170,.08)":"rgba(255,255,255,.03)",border:`1px solid ${method==="smart"?"rgba(0,212,170,.4)":"rgba(255,255,255,.08)"}`,borderRadius:12,padding:16}}>
          <div style={{color:"#00d4aa",fontWeight:700,marginBottom:12,fontSize:13}}>⚡ Smart Contract</div>
          <Row label="Mahkeme harcı" value="0 JC" color="#00d4aa" note="Yok"/>
          <Row label="Enflasyon kaybı" value="0 JC" color="#00d4aa" note="Anında"/>
          <Row label="Fırsat maliyeti" value="0 JC" color="#00d4aa" note="0 yıl bekliş"/>
          <Row label="Konkordato riski" value="%0" color="#00d4aa"/>
        </div>
        <div style={{background:method!=="smart"?"rgba(255,68,68,.08)":"rgba(255,255,255,.03)",border:`1px solid ${method!=="smart"?"rgba(255,68,68,.3)":"rgba(255,255,255,.08)"}`,borderRadius:12,padding:16}}>
          <div style={{color:"#ff6b35",fontWeight:700,marginBottom:12,fontSize:13}}>⚖️ Klasik Yöntem</div>
          <Row label="Mahkeme harcı" value={`${autopsy.courtFee} JC`} color="#ff6b35"/>
          <Row label="Enflasyon kaybı" value={`${autopsy.inflationLoss} JC`} color="#ff4444"/>
          <Row label="Fırsat maliyeti" value={`${autopsy.opportunityCost} JC`} color="#ff4444"/>
          <Row label="Konkordato riski" value={`%${autopsy.konkordatoRisk}`} color="#f39c12"/>
        </div>
      </div>

      {/* Loss aversion section */}
      {autopsy.opportunityCost>0 && (
        <div style={{background:"rgba(255,107,53,.08)",border:"1px solid rgba(255,107,53,.2)",borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{color:"#ff6b35",fontWeight:700,marginBottom:8,fontSize:13}}>⏱️ Fırsat Maliyeti Gerçekte Ne Demek?</div>
          <p style={{color:"#a0aec0",fontSize:13,lineHeight:1.7}}>
            {autopsy.opportunityCost} JC = <strong style={{color:"#ff6b35"}}>{humanCost.hours} çalışma saati</strong> = {humanCost.weeks} haftalık emek.<br/>
            Bu sürede paranız alternatif yatırımda <strong style={{color:"#f39c12"}}>%{Math.round(OPPORTUNITY_YIELD*100)}</strong> getiri sağlayabilirdi.
          </p>
        </div>
      )}

      {/* Summary */}
      <div style={{background:scAdvantageRealized?"rgba(255,68,68,.06)":"rgba(0,212,170,.06)",border:`1px solid ${scAdvantageRealized?"rgba(255,68,68,.2)":"rgba(0,212,170,.2)"}`,borderRadius:12,padding:16,marginBottom:20}}>
        <p style={{color:scAdvantageRealized?"#fc8181":"#68d391",fontSize:13,lineHeight:1.7}}>{autopsy.summary}</p>
        {scAdvantageRealized && (
          <div style={{marginTop:8,color:"#ff6b35",fontWeight:700,fontSize:15}}>
            Toplam Kaçınılabilir Kayıp: <span style={{color:"#ff4444"}}>{autopsy.totalClassicLoss} JC</span>
          </div>
        )}
      </div>

      <button onClick={onDone} style={{width:"100%",padding:"14px 0",background:"linear-gradient(135deg,#00d4aa,#0099ff)",border:"none",borderRadius:10,color:"#060a10",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer"}}>
        Devam Et →
      </button>
    </div>
  );
}

// ─── LEGAL RECEIPT ────────────────────────────────────────────────────────────
function LegalReceipt({entries, title, total, color="#00d4aa"}) {
  return (
    <div style={{background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.08)",borderRadius:12,padding:20,fontFamily:"'Space Mono',monospace",animation:"receiptIn .4s ease-out"}}>
      <div style={{color,fontSize:12,fontWeight:700,marginBottom:12,letterSpacing:2}}>{title}</div>
      {entries.map((e,i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,.04)",color:e.accent?e.accent:"#718096",fontSize:12}}>
          <span>{e.label}</span><span style={{fontWeight:e.bold?700:400}}>{e.value}</span>
        </div>
      ))}
      <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0 0",color,fontSize:14,fontWeight:700,borderTop:`1px solid ${color}44`,marginTop:4}}>
        <span>TOPLAM</span><span>{total}</span>
      </div>
    </div>
  );
}

// ─── CONTRACT MODAL (SC ARCHITECT) ───────────────────────────────────────────
function ContractModal({bot, trustScore, onExecute, onBack, dominoBump, crashActive}) {
  const [params, setParams] = useState({timeout:15, penaltyRate:20, useOracle:false});
  // v2.5 fix #1: effectivePenaltyRate computed in state; updated via useEffect
  const [effectivePenaltyRate, setEffectivePenaltyRate] = useState(20);
  const [evalResult, setEvalResult] = useState(null);
  const [scTime, setScTime] = useState(Date.now());

  useEffect(()=>{
    const discount = Math.floor((trustScore/MAX_TRUST_SCORE)*TRUST_DISCOUNT_MAX);
    setEffectivePenaltyRate(Math.max(0, params.penaltyRate-discount));
  },[params.penaltyRate, trustScore]);

  useEffect(()=>{
    const ev = botEvaluateContract(bot, {...params, penaltyRate:effectivePenaltyRate}, trustScore);
    setEvalResult(ev);
  },[params, effectivePenaltyRate, trustScore]);

  const successRate = computeSuccessRate(bot, {...params,penaltyRate:effectivePenaltyRate}, crashActive, dominoBump);
  const actualPrice = evalResult && !evalResult.refused ? Math.round(bot.basePrice*evalResult.priceMultiplier) : bot.basePrice;
  const totalCost = actualPrice + (params.useOracle ? ORACLE_FEE : 0);

  function handleExecute() {
    track("SC_ARCHITECT",{
      botId:bot.id, timeout:params.timeout, penaltyRate:params.penaltyRate,
      useOracle:params.useOracle, trustDiscountApplied:evalResult?.discount||0,
      botResponse:evalResult?.refused?"refused":"accepted",
      priceBumpPercent:evalResult?Math.round((evalResult.priceMultiplier-1)*100):0,
      reasoningTimeMs:Date.now()-scTime,
    });
    onExecute({params:{...params,effectivePenaltyRate}, evalResult, totalCost, actualPrice});
  }

  const Slider = ({label, field, min, max, step=1, valueLabel})=>(
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
        <span style={{color:"#a0aec0",fontSize:13}}>{label}</span>
        <span style={{color:"#00d4aa",fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700}}>{valueLabel||params[field]}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={params[field]}
        onChange={e=>setParams(p=>({...p,[field]:Number(e.target.value)}))}
        style={{accentColor:"#00d4aa"}}
      />
    </div>
  );

  return (
    <div>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:40,marginBottom:8}}>⚡</div>
        <h3 style={{color:"#e2e8f0",fontSize:20,marginBottom:4}}>Smart Contract Mimarı</h3>
        <p style={{color:"#718096",fontSize:13}}>Sözleşme şartlarını ayarlayın</p>
        {crashActive && <div style={{background:"rgba(255,68,68,.1)",border:"1px solid rgba(255,68,68,.3)",color:"#fc8181",borderRadius:8,padding:"8px 12px",marginTop:8,fontSize:12}}>⚠️ Piyasa krizi aktif — başarı oranları düşük</div>}
      </div>

      <Slider label={<><LegalTermTooltip termKey="temerrut">Teslim Süresi</LegalTermTooltip></>} field="timeout" min={5} max={60} valueLabel={`${params.timeout} gün`}/>

      <div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{color:"#a0aec0",fontSize:13}}><LegalTermTooltip termKey="cezaiSart">Cezai Şart</LegalTermTooltip></span>
          <div style={{textAlign:"right"}}>
            {evalResult?.discount>0 && (
              <span style={{color:"#4a5568",fontSize:11,textDecoration:"line-through",marginRight:6}}>%{params.penaltyRate}</span>
            )}
            <span style={{color:"#00d4aa",fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700}}>
              %{effectivePenaltyRate}
            </span>
            {evalResult?.discount>0 && <span style={{color:"#00d4aa",fontSize:10,marginLeft:4}}>(güven indirimi -{evalResult.discount})</span>}
          </div>
        </div>
        <input type="range" min={5} max={50} value={params.penaltyRate}
          onChange={e=>setParams(p=>({...p,penaltyRate:Number(e.target.value)}))}
          style={{width:"100%",accentColor:"#00d4aa"}}
        />
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.08)",borderRadius:10,padding:"14px 16px",marginBottom:20}}>
        <div>
          <div style={{color:"#a0aec0",fontSize:13}}><LegalTermTooltip termKey="oracle">Oracle Entegrasyonu</LegalTermTooltip></div>
          <div style={{color:"#4a5568",fontSize:11,marginTop:2}}>+{ORACLE_FEE} JC · Başarı oranını önemli ölçüde artırır</div>
        </div>
        <label style={{position:"relative",display:"inline-block",width:44,height:24,cursor:"pointer"}}>
          <input type="checkbox" checked={params.useOracle} onChange={e=>setParams(p=>({...p,useOracle:e.target.checked}))} style={{opacity:0,width:0,height:0}}/>
          <span style={{position:"absolute",inset:0,background:params.useOracle?"#00d4aa":"rgba(255,255,255,.1)",borderRadius:12,transition:"background .2s"}}/>
          <span style={{position:"absolute",top:3,left:params.useOracle?23:3,width:18,height:18,background:"#fff",borderRadius:"50%",transition:"left .2s"}}/>
        </label>
      </div>

      {/* Bot evaluation feedback */}
      {evalResult && (
        <div style={{marginBottom:20,padding:14,borderRadius:10,
          background:evalResult.refused?"rgba(255,68,68,.08)":evalResult.priceMultiplier>1?"rgba(255,107,53,.08)":"rgba(0,212,170,.08)",
          border:`1px solid ${evalResult.refused?"rgba(255,68,68,.3)":evalResult.priceMultiplier>1?"rgba(255,107,53,.3)":"rgba(0,212,170,.2)"}`,
        }}>
          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{fontSize:20}}>{bot.emoji}</span>
            <div>
              <div style={{color:"#e2e8f0",fontSize:13,fontWeight:600,marginBottom:4}}>{bot.name}:</div>
              <div style={{color:evalResult.refused?"#fc8181":evalResult.priceMultiplier>1?"#f6ad55":"#68d391",fontSize:13}}>
                {evalResult.reason || `"Şartları kabul ediyorum."`}
              </div>
            </div>
          </div>
          <div style={{marginTop:12,display:"flex",gap:16,fontSize:12}}>
            <div style={{color:"#718096"}}>Başarı: <strong style={{color:successRate>0.6?"#00d4aa":successRate>0.3?"#f39c12":"#ff4444"}}>%{Math.round(successRate*100)}</strong></div>
            <div style={{color:"#718096"}}>Toplam maliyet: <strong style={{color:"#e2e8f0"}}>{totalCost} JC</strong></div>
            {dominoBump>0 && <div style={{color:"#ff6b35",fontSize:11}}>Domino: -{Math.round(dominoBump*100)}%</div>}
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <button onClick={onBack} style={{padding:"12px 0",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"#a0aec0",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:14,cursor:"pointer"}}>
          ← Geri
        </button>
        <button onClick={handleExecute} disabled={evalResult?.refused}
          style={{padding:"12px 0",background:evalResult?.refused?"rgba(255,255,255,.05)":"linear-gradient(135deg,#00d4aa,#0099ff)",border:"none",borderRadius:10,color:evalResult?.refused?"#4a5568":"#060a10",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,cursor:evalResult?.refused?"not-allowed":"pointer"}}>
          {evalResult?.refused?"Bot Reddetti":"Sözleşmeyi Kilitle ⚡"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PART 4 — QUICK DEMO, SCENARIO MODE, COMPARISON TOOL
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── QUICK DEMO (30 saniye) ───────────────────────────────────────────────────
function QuickDemo({onBack}) {
  const bot = BOTS.find(b=>b.id==="opportunist");
  const [phase, setPhase] = useState("idle"); // idle | running | done
  const [classicResult, setClassicResult] = useState(null);
  const [scResult, setScResult] = useState(null);
  const [step, setStep] = useState(0);

  const STEPS = [
    "Fırsatçı Freelancer seçildi…",
    "Klasik sözleşme imzalanıyor…",
    "Teslim bekleniyor… (2 yıl geçti)",
    "Bot teslim etmedi!",
    "Dava açıldı — 2 yıl süreç…",
    "Smart Contract hazırlanıyor…",
    "Şartlar kilitleniyor…",
    "Bot teslim edemedi — otomatik iade!",
  ];

  function runDemo() {
    setPhase("running");
    setStep(0);
    track("QUICK_DEMO_START",{botId:"opportunist"});

    const interval = setInterval(()=>{
      setStep(s=>{
        if (s>=STEPS.length-1) {
          clearInterval(interval);
          const classicYears = LAWSUIT_YEARS_BY_BOT["opportunist"];
          const inflMult = INFLATION_BY_YEAR[classicYears]||0.68;
          const courtFee = computeCourtFee(bot.basePrice);
          const lawyerFee = 70;
          const totalSpent = bot.basePrice+courtFee+lawyerFee;
          const recovered = Math.floor(bot.basePrice*inflMult*0.52);
          const classicLoss = totalSpent-recovered;
          setClassicResult({totalSpent,recovered,courtFee,lawyerFee,classicLoss,years:classicYears});
          const oracleFee = ORACLE_FEE;
          const scSuccess = false; // demo: SC fails but refunds
          const scLoss = oracleFee;
          setScResult({totalSpent:bot.basePrice+oracleFee,refunded:bot.basePrice,netLoss:scLoss});
          setPhase("done");
          track("QUICK_DEMO_DONE",{classicLoss,scLoss});
          return s;
        }
        return s+1;
      });
    }, 800);
  }

  return (
    <div style={{maxWidth:680,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{color:"#00d4aa",fontFamily:"'Space Mono',monospace",fontSize:11,letterSpacing:2,marginBottom:8}}>QUICK DEMO — 30 SANİYE</div>
        <h2 style={{color:"#e2e8f0",fontSize:26,marginBottom:8}}>SC vs Klasik — Aynı Anlaşma</h2>
        <p style={{color:"#718096",fontSize:14}}>Fırsatçı Freelancer ile her iki yöntemi eş zamanlı görün.</p>
      </div>

      {phase==="idle" && (
        <div style={{textAlign:"center"}}>
          <div style={{background:"rgba(255,107,53,.08)",border:"1px solid rgba(255,107,53,.2)",borderRadius:16,padding:24,marginBottom:24}}>
            <div style={{fontSize:40,marginBottom:8}}>🦊</div>
            <div style={{color:"#e2e8f0",fontWeight:700,fontSize:18,marginBottom:4}}>Fırsatçı Freelancer</div>
            <div style={{color:"#718096",fontSize:13}}>Başarı oranı %22 · Yüksek risk · Teslim etmeme ihtimali yüksek</div>
          </div>
          <button onClick={runDemo} style={{padding:"14px 40px",background:"linear-gradient(135deg,#00d4aa,#0099ff)",border:"none",borderRadius:12,color:"#060a10",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,cursor:"pointer"}}>
            Simülasyonu Başlat ▶
          </button>
        </div>
      )}

      {phase==="running" && (
        <div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {STEPS.map((s,i)=>(
              <div key={i} style={{
                padding:"12px 16px",borderRadius:10,
                background:i<=step?"rgba(0,212,170,.06)":"rgba(255,255,255,.02)",
                border:`1px solid ${i<=step?"rgba(0,212,170,.2)":"rgba(255,255,255,.05)"}`,
                color:i<=step?"#e2e8f0":"#4a5568",fontSize:13,
                transition:"all .3s",
              }}>
                {i<step?"✓ ":i===step?"⟳ ":"○ "}{s}
              </div>
            ))}
          </div>
        </div>
      )}

      {phase==="done" && classicResult && scResult && (
        <div style={{animation:"countUp .5s ease-out"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
            <div style={{background:"rgba(255,68,68,.08)",border:"2px solid rgba(255,68,68,.3)",borderRadius:16,padding:20}}>
              <div style={{color:"#ff4444",fontWeight:700,marginBottom:16,fontSize:14}}>⚖️ Klasik Yöntem</div>
              <div style={{color:"#4a5568",fontSize:12,marginBottom:4}}>Ödenen: <span style={{color:"#e2e8f0"}}>{classicResult.totalSpent} JC</span></div>
              <div style={{color:"#4a5568",fontSize:12,marginBottom:4}}>Geri alınan: <span style={{color:"#f39c12"}}>{classicResult.recovered} JC</span></div>
              <div style={{color:"#4a5568",fontSize:12,marginBottom:4}}>Süre: <span style={{color:"#ff6b35"}}>{classicResult.years} yıl</span></div>
              <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid rgba(255,68,68,.2)"}}>
                <div style={{color:"#718096",fontSize:11}}>NET KAYIP</div>
                <div style={{color:"#ff4444",fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:22}}>{classicResult.classicLoss} JC</div>
              </div>
            </div>
            <div style={{background:"rgba(0,212,170,.08)",border:"2px solid rgba(0,212,170,.3)",borderRadius:16,padding:20}}>
              <div style={{color:"#00d4aa",fontWeight:700,marginBottom:16,fontSize:14}}>⚡ Smart Contract</div>
              <div style={{color:"#4a5568",fontSize:12,marginBottom:4}}>Ödenen: <span style={{color:"#e2e8f0"}}>{scResult.totalSpent} JC</span></div>
              <div style={{color:"#4a5568",fontSize:12,marginBottom:4}}>İade: <span style={{color:"#00d4aa"}}>{scResult.refunded} JC</span></div>
              <div style={{color:"#4a5568",fontSize:12,marginBottom:4}}>Süre: <span style={{color:"#00d4aa"}}>Anında</span></div>
              <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid rgba(0,212,170,.2)"}}>
                <div style={{color:"#718096",fontSize:11}}>NET KAYIP</div>
                <div style={{color:"#00d4aa",fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:22}}>{scResult.netLoss} JC</div>
              </div>
            </div>
          </div>
          <div style={{background:"rgba(0,212,170,.06)",border:"1px solid rgba(0,212,170,.2)",borderRadius:12,padding:16,textAlign:"center",marginBottom:24}}>
            <div style={{color:"#00d4aa",fontWeight:700,fontSize:18}}>
              Smart Contract {classicResult.classicLoss-scResult.netLoss} JC tasarruf sağladı
            </div>
            <div style={{color:"#718096",fontSize:13,marginTop:4}}>ve {classicResult.years} yıl beklemeye gerek kalmadı</div>
          </div>
          <div style={{display:"flex",gap:12}}>
            <button onClick={()=>setPhase("idle")} style={{flex:1,padding:"12px 0",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"#a0aec0",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:14,cursor:"pointer"}}>
              Tekrar Dene
            </button>
            <button onClick={onBack} style={{flex:1,padding:"12px 0",background:"linear-gradient(135deg,#00d4aa,#0099ff)",border:"none",borderRadius:10,color:"#060a10",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer"}}>
              Tam Simülasyon →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SCENARIO MODE ────────────────────────────────────────────────────────────
function ScenarioMode({onLaunch, onBack}) {
  const [selected, setSelected] = useState(null);

  return (
    <div style={{maxWidth:680,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{color:"#f39c12",fontFamily:"'Space Mono',monospace",fontSize:11,letterSpacing:2,marginBottom:8}}>SENARYO MODU — 5-7 DAKİKA</div>
        <h2 style={{color:"#e2e8f0",fontSize:26,marginBottom:8}}>Gerçek Vaka Senaryoları</h2>
        <p style={{color:"#718096",fontSize:14}}>Gerçek ticaret sorunlarına dayalı simülasyonlar.</p>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:16,marginBottom:24}}>
        {SCENARIOS.map(s=>(
          <div key={s.id} onClick={()=>setSelected(s)} style={{
            border:`2px solid ${selected?.id===s.id?"rgba(0,212,170,.6)":"rgba(255,255,255,.08)"}`,
            borderRadius:16,padding:24,cursor:"pointer",
            background:selected?.id===s.id?"rgba(0,212,170,.06)":"rgba(255,255,255,.02)",
            transition:"all .2s",
          }}>
            <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
              <span style={{fontSize:32,flexShrink:0}}>{s.emoji}</span>
              <div>
                <div style={{color:"#e2e8f0",fontWeight:700,fontSize:16}}>{s.title}</div>
                <div style={{color:"#718096",fontSize:12,marginBottom:8}}>{s.subtitle}</div>
                <p style={{color:"#a0aec0",fontSize:13,lineHeight:1.6,marginBottom:10}}>{s.description}</p>
                <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#718096"}}>
                  <strong style={{color:"#00d4aa"}}>Öğrenme hedefi:</strong> {s.learningGoal}
                </div>
                <div style={{marginTop:8,fontSize:11,color:"#4a5568",fontStyle:"italic"}}>{s.stat}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:12}}>
        <button onClick={onBack} style={{padding:"12px 24px",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"#a0aec0",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:14,cursor:"pointer"}}>
          ← Geri
        </button>
        <button disabled={!selected} onClick={()=>onLaunch(selected)} style={{
          flex:1,padding:"12px 0",border:"none",borderRadius:10,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,cursor:selected?"pointer":"not-allowed",
          background:selected?"linear-gradient(135deg,#f39c12,#e67e22)":"rgba(255,255,255,.05)",
          color:selected?"#060a10":"#4a5568",
        }}>
          {selected?`${selected.title} Senaryosunu Başlat →`:"Senaryo Seçin"}
        </button>
      </div>
    </div>
  );
}

// ─── COMPARISON TOOL ─────────────────────────────────────────────────────────
function ComparisonTool({onBack}) {
  const [form, setForm] = useState({contractValue:50000,counterpartyRisk:"orta",durationMonths:12,jurisdiction:"turkey"});
  const [result, setResult] = useState(null);

  function compute() {
    track("CTA_CLICK",{ctaType:"comparison_tool_compute"});
    const val = form.contractValue;
    const months = form.durationMonths;
    const years = months/12;
    const riskMultipliers = {dusuk:0.1, orta:0.35, yuksek:0.7};
    const failChance = riskMultipliers[form.counterpartyRisk]||0.35;
    const intlExtra = form.jurisdiction==="international" ? 1.5 : 1;

    const classicCourtFee = Math.round(val*COURT_FEE_RATE);
    const classicLawyerFee = Math.round(val*0.07*intlExtra);
    const inflMult = INFLATION_BY_YEAR[Math.min(Math.floor(years)+1,10)]||0.5;
    const classicInflLoss = Math.floor(val*(1-inflMult));
    const classicOppCost = Math.floor(val*(Math.pow(1+OPPORTUNITY_YIELD,Math.max(years,1))-1));
    const classicKonkRisk = Math.round(failChance*KONKORDATO_CHANCE*100);
    const classicTotalRisk = classicCourtFee+classicLawyerFee+classicInflLoss+classicOppCost;

    const scOracleFee = form.jurisdiction==="international"?60:30;
    const scProtectionRate = 1-(failChance*(1-0.85));
    const scTotalRisk = Math.round(val*failChance*0.08)+scOracleFee;

    setResult({val,classicCourtFee,classicLawyerFee,classicInflLoss,classicOppCost,classicKonkRisk,classicTotalRisk,scOracleFee,scProtectionRate,scTotalRisk,savings:classicTotalRisk-scTotalRisk});
  }

  const f = (n)=>n.toLocaleString("tr-TR");

  return (
    <div style={{maxWidth:720,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{color:"#9b59b6",fontFamily:"'Space Mono',monospace",fontSize:11,letterSpacing:2,marginBottom:8}}>KARŞILAŞTIRMA ARACI — 2 DAKİKA</div>
        <h2 style={{color:"#e2e8f0",fontSize:26,marginBottom:8}}>Risk Analizi Hesaplayıcı</h2>
        <p style={{color:"#718096",fontSize:14}}>Sözleşmenizi parametrelerini girin, SC avantajını görün.</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
        <div>
          <label style={{color:"#a0aec0",fontSize:13,display:"block",marginBottom:8}}>Sözleşme Bedeli (TL)</label>
          <input type="number" value={form.contractValue} onChange={e=>setForm(f=>({...f,contractValue:Number(e.target.value)}))}
            style={{width:"100%",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontFamily:"'Space Mono',monospace",fontSize:14,outline:"none"}}
          />
        </div>
        <div>
          <label style={{color:"#a0aec0",fontSize:13,display:"block",marginBottom:8}}>Süre (Ay)</label>
          <input type="number" value={form.durationMonths} onChange={e=>setForm(f=>({...f,durationMonths:Number(e.target.value)}))}
            style={{width:"100%",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontFamily:"'Space Mono',monospace",fontSize:14,outline:"none"}}
          />
        </div>
        <div>
          <label style={{color:"#a0aec0",fontSize:13,display:"block",marginBottom:8}}>Karşı Taraf Riski</label>
          <select value={form.counterpartyRisk} onChange={e=>setForm(f=>({...f,counterpartyRisk:e.target.value}))}
            style={{width:"100%",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontFamily:"'Syne',sans-serif",fontSize:14,outline:"none"}}>
            <option value="dusuk">Düşük</option>
            <option value="orta">Orta</option>
            <option value="yuksek">Yüksek</option>
          </select>
        </div>
        <div>
          <label style={{color:"#a0aec0",fontSize:13,display:"block",marginBottom:8}}>Yetki Alanı</label>
          <select value={form.jurisdiction} onChange={e=>setForm(f=>({...f,jurisdiction:e.target.value}))}
            style={{width:"100%",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontFamily:"'Syne',sans-serif",fontSize:14,outline:"none"}}>
            <option value="turkey">Türkiye</option>
            <option value="international">Uluslararası</option>
          </select>
        </div>
      </div>

      <button onClick={compute} style={{width:"100%",padding:"14px 0",background:"linear-gradient(135deg,#9b59b6,#8e44ad)",border:"none",borderRadius:10,color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer",marginBottom:24}}>
        Risk Analizi Hesapla →
      </button>

      {result && (
        <div style={{animation:"countUp .4s ease-out"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
            <div style={{background:"rgba(255,68,68,.08)",border:"1px solid rgba(255,68,68,.3)",borderRadius:12,padding:20}}>
              <div style={{color:"#ff4444",fontWeight:700,marginBottom:16}}>⚖️ Klasik Yöntem Riski</div>
              <div style={{fontSize:13,color:"#718096",display:"flex",flexDirection:"column",gap:8}}>
                <div>Mahkeme harcı: <strong style={{color:"#e2e8f0"}}>{f(result.classicCourtFee)} TL</strong></div>
                <div>Avukat ücreti: <strong style={{color:"#e2e8f0"}}>{f(result.classicLawyerFee)} TL</strong></div>
                <div>Enflasyon kaybı: <strong style={{color:"#ff6b35"}}>{f(result.classicInflLoss)} TL</strong></div>
                <div>Fırsat maliyeti: <strong style={{color:"#ff6b35"}}>{f(result.classicOppCost)} TL</strong></div>
                <div>Konkordato riski: <strong style={{color:"#f39c12"}}>%{result.classicKonkRisk}</strong></div>
              </div>
              <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid rgba(255,68,68,.2)"}}>
                <div style={{color:"#718096",fontSize:11}}>TOPLAM RİSK</div>
                <div style={{color:"#ff4444",fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:20}}>{f(result.classicTotalRisk)} TL</div>
              </div>
            </div>
            <div style={{background:"rgba(0,212,170,.08)",border:"1px solid rgba(0,212,170,.3)",borderRadius:12,padding:20}}>
              <div style={{color:"#00d4aa",fontWeight:700,marginBottom:16}}>⚡ Smart Contract Riski</div>
              <div style={{fontSize:13,color:"#718096",display:"flex",flexDirection:"column",gap:8}}>
                <div>Oracle ücreti: <strong style={{color:"#e2e8f0"}}>{f(result.scOracleFee)} TL</strong></div>
                <div>Mahkeme harcı: <strong style={{color:"#00d4aa"}}>0 TL</strong></div>
                <div>Enflasyon kaybı: <strong style={{color:"#00d4aa"}}>0 TL</strong></div>
                <div>Bekleme süresi: <strong style={{color:"#00d4aa"}}>0 yıl</strong></div>
                <div>Koruma oranı: <strong style={{color:"#00d4aa"}}>%{Math.round(result.scProtectionRate*100)}</strong></div>
              </div>
              <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid rgba(0,212,170,.2)"}}>
                <div style={{color:"#718096",fontSize:11}}>TOPLAM RİSK</div>
                <div style={{color:"#00d4aa",fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:20}}>{f(result.scTotalRisk)} TL</div>
              </div>
            </div>
          </div>
          <div style={{background:"rgba(0,212,170,.06)",border:"1px solid rgba(0,212,170,.2)",borderRadius:12,padding:20,textAlign:"center"}}>
            <div style={{color:"#00d4aa",fontWeight:700,fontSize:20,marginBottom:4}}>
              Smart Contract ile {f(result.savings)} TL tasarruf potansiyeli
            </div>
            <div style={{color:"#718096",fontSize:13}}>Bu analiz simülasyon amaçlıdır. Gerçek sözleşme danışmanlığı için uzman görüşü alın.</div>
          </div>
        </div>
      )}

      <button onClick={onBack} style={{marginTop:16,padding:"10px 24px",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"#a0aec0",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:14,cursor:"pointer"}}>
        ← Geri
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PART 5 — SOCIAL PROOF, SMART CTA, FULL SIMULATION, APP
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── SOCIAL PROOF WIDGET ─────────────────────────────────────────────────────
function SocialProofWidget() {
  // Aggregate verileri — gerçekte API'den çekilir
  const data = {
    todayCount: 847+Math.floor(Date.now()/600000)%30,
    scPreferenceRate: 73,
    avgSavings: 2840,
    konkordatoAvoided: 124,
  };
  return (
    <div style={{background:"rgba(0,212,170,.04)",border:"1px solid rgba(0,212,170,.15)",borderRadius:12,padding:"12px 20px",display:"flex",gap:24,flexWrap:"wrap",justifyContent:"center"}}>
      {[
        {value:data.todayCount,label:"Bugün denedi",suffix:""},
        {value:`%${data.scPreferenceRate}`,label:"SC tercih etti",suffix:""},
        {value:`${data.avgSavings} JC`,label:"Ort. tasarruf",suffix:""},
        {value:data.konkordatoAvoided,label:"Konkordato önlendi",suffix:""},
      ].map((d,i)=>(
        <div key={i} style={{textAlign:"center"}}>
          <div style={{color:"#00d4aa",fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:16}}>{d.value}</div>
          <div style={{color:"#4a5568",fontSize:11}}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── SMART CTA ────────────────────────────────────────────────────────────────
function SmartCTA({classicLost, scSucceeded, sessionCount, onCTA}) {
  let primary, secondary, urgent=false;

  if (classicLost && !scSucceeded) {
    primary = {label:"Smart Contract ile Aynı Anlaşmayı Simüle Et", action:"retry_sc"};
    secondary = {label:"Ücretsiz Hukuki Danışmanlık Al", action:"legal_consult"};
    urgent = true;
  } else if (scSucceeded) {
    primary = {label:"Gerçek Sözleşmenizi Smart Contract'a Dönüştürün", action:"convert"};
    secondary = {label:"Beyaz Kağıdı İndir", action:"whitepaper"};
  } else if (sessionCount>=3) {
    primary = {label:"Demo Görüşme Ayarlayın", action:"demo_call"};
    secondary = null;
  } else {
    primary = {label:"Daha Fazla Senaryo Dene", action:"scenarios"};
    secondary = {label:"Bültene Kaydol", action:"newsletter"};
  }

  return (
    <div style={{
      background: urgent?"rgba(255,68,68,.06)":"rgba(0,212,170,.06)",
      border:`1px solid ${urgent?"rgba(255,68,68,.25)":"rgba(0,212,170,.2)"}`,
      borderRadius:16,padding:24,marginTop:16,
    }}>
      {urgent && <div style={{color:"#ff4444",fontSize:11,fontWeight:700,letterSpacing:2,marginBottom:12}}>⚠️ KAÇIRILAN KORUMA</div>}
      <button onClick={()=>{track("CTA_CLICK",{ctaType:primary.action});onCTA(primary.action);}}
        style={{
          width:"100%",padding:"14px 0",marginBottom:secondary?12:0,
          background:urgent?"linear-gradient(135deg,#ff4444,#ff6b35)":"linear-gradient(135deg,#00d4aa,#0099ff)",
          border:"none",borderRadius:10,color:urgent?"#fff":"#060a10",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer",
        }}>
        {primary.label}
      </button>
      {secondary && (
        <button onClick={()=>{track("CTA_CLICK",{ctaType:secondary.action});onCTA(secondary.action);}}
          style={{width:"100%",padding:"10px 0",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"#a0aec0",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:14,cursor:"pointer"}}>
          {secondary.label}
        </button>
      )}
    </div>
  );
}

// ─── FULL SIMULATION ──────────────────────────────────────────────────────────
function FullSimulation({abVariant, coins, setCoins, trustScores, setTrustScores, stats, setStats, capitalProtected, setCapitalProtected, legalRisk, setLegalRisk, sessionStart, sessionCount, preloadScenario}) {
  const [phase, setPhase] = useState("select_bot");
  const [selectedBot, setSelectedBot] = useState(null);
  const [chosenMethod, setChosenMethod] = useState(null);
  const [hasPlayedClassic, setHasPlayedClassic] = useState(false);
  const [crashActive, setCrashActive] = useState(false);
  const [dominoBump, setDominoBump] = useState(0);

  // SC Architect state
  const [scExecData, setScExecData] = useState(null);
  const [contractId, setContractId] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [autopsy, setAutopsy] = useState(null);
  const [konkordato, setKonkordato] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState(null);
  const [legalMode, setLegalMode] = useState("lawsuit");

  // Coin animation queue — v2.5 fix #4
  const animQueueRef = useRef([]);
  const animRunningRef = useRef(false);
  const [coinAnim, setCoinAnim] = useState(null);

  function queueCoinAnim(amount) {
    animQueueRef.current.push(amount);
    drainAnimQueue();
  }
  function drainAnimQueue() {
    if (animRunningRef.current || animQueueRef.current.length===0) return;
    animRunningRef.current = true;
    const amount = animQueueRef.current.shift();
    setCoinAnim({amount, id:Date.now()});
    setTimeout(()=>{
      setCoinAnim(null);
      animRunningRef.current = false;
      drainAnimQueue();
    }, 700);
  }

  // Preload scenario if provided
  useEffect(()=>{
    if (!preloadScenario) return;
    const bot = BOTS.find(b=>b.id===preloadScenario.botId)||BOTS[1];
    setSelectedBot(bot);
    if (preloadScenario.forceCrash) setCrashActive(true);
    setPhase("choose_method");
    track("BOT_SELECT",{botId:bot.id,trustScoreAtSelect:trustScores[bot.id]||50,timeSpentOnCardMs:0});
  },[preloadScenario]);

  // A/B variant A: force classic on first game
  const isMethodLocked = abVariant==="forceClassicFirst" && !hasPlayedClassic;

  function handleBotSelect(bot) {
    const now = Date.now();
    track("BOT_SELECT",{botId:bot.id,trustScoreAtSelect:trustScores[bot.id]||50,timeSpentOnCardMs:0});
    setSelectedBot(bot);
    setPhase("choose_method");
  }

  function handleMethodChoice(method) {
    if (isMethodLocked && method==="smart") return;
    track("METHOD_CHOICE",{chosenMethod:method,rejectedMethod:method==="smart"?"classic":"smart",reasoningTimeMs:0});
    setChosenMethod(method);
    if (method==="smart") {
      setPhase("sc_architect");
    } else {
      setPhase("classic_lawyer");
    }
  }

  function handleSCExecute({params, evalResult, totalCost, actualPrice}) {
    if (coins < totalCost) { alert("Yetersiz bakiye!"); return; }
    setCoins(c=>c-totalCost);
    queueCoinAnim(-totalCost);
    const cid = genContractId();
    setContractId(cid);
    setScExecData({params, evalResult, totalCost, actualPrice});
    setPhase("sc_executing");

    const {reward} = computeDynamicReward(selectedBot, crashActive);
    const successRate = computeSuccessRate(selectedBot, {...params,penaltyRate:params.effectivePenaltyRate}, crashActive, dominoBump);
    const success = Math.random()<successRate;

    setTimeout(()=>{
      if (success) {
        setCoins(c=>c+reward);
        queueCoinAnim(+reward);
        setTrustScores(s=>applyTrustUpdate(s,selectedBot.id,"sc_success"));
        // v2.5 fix #3: reduce domino bump on SC success
        setDominoBump(d=>Math.max(0,d-DOMINO_RECOVERY));
        setCapitalProtected(c=>c+actualPrice);
        setStats(s=>({...s,wins:s.wins+1,scUses:s.scUses+1}));
        track("CONTRACT_OUTCOME",{botId:selectedBot.id,method:"smart",success:true,profitLoss:reward-totalCost,durationSeconds:0,konkordatoTriggered:false,legalMode:"none",yearsSpent:0});
        setOutcome({success:true,reward,profit:reward-totalCost,method:"smart",yearsSpent:0,refunded:0,dialogue:pickRandom(selectedBot.dialogues.success)});
      } else {
        setCoins(c=>c+actualPrice);
        queueCoinAnim(+actualPrice);
        setTrustScores(s=>applyTrustUpdate(s,selectedBot.id,"sc_fail"));
        setDominoBump(d=>Math.min(d+DOMINO_FAILURE_BUMP,0.8));
        setStats(s=>({...s,losses:s.losses+1,scUses:s.scUses+1}));
        track("CONTRACT_OUTCOME",{botId:selectedBot.id,method:"smart",success:false,profitLoss:-(params.useOracle?ORACLE_FEE:0),durationSeconds:0,konkordatoTriggered:false,legalMode:"none",yearsSpent:0});
        setOutcome({success:false,reward:0,profit:-(params.useOracle?ORACLE_FEE:0),method:"smart",yearsSpent:0,refunded:actualPrice,dialogue:pickRandom(selectedBot.dialogues.fail)});
      }
      const aut = computeAutopsy("smart",selectedBot,0,success);
      setAutopsy(aut);
      setPhase("sc_result");
    }, selectedBot.delay);
  }

  function handleLawyerSelect(lawyer, mode) {
    const fee = mode==="lawsuit" ? computeCourtFee(selectedBot.basePrice) : computeArbitrationFee(selectedBot.basePrice);
    const totalFee = fee+lawyer.fee;
    if (coins<totalFee) { alert("Yetersiz bakiye!"); return; }
    setCoins(c=>c-totalFee);
    queueCoinAnim(-totalFee);
    setSelectedLawyer(lawyer);
    setLegalMode(mode);
    setHasPlayedClassic(true);
    setStats(s=>({...s,classicUses:s.classicUses+1}));
    setPhase("classic_tunnel");
  }

  function handleTunnelComplete({won, konkordato:konk, totalYears, isArb}) {
    setKonkordato(konk);
    const courtFee = isArb ? computeArbitrationFee(selectedBot.basePrice) : computeCourtFee(selectedBot.basePrice);
    const lawyerFee = selectedLawyer?.fee||0;
    if (won) {
      const inflMult = INFLATION_BY_YEAR[totalYears]||0.2;
      const recovered = Math.floor(selectedBot.basePrice*inflMult*(selectedLawyer?.recoveryRate||0.5));
      setCoins(c=>c+recovered);
      queueCoinAnim(+recovered);
      setTrustScores(s=>applyTrustUpdate(s,selectedBot.id,isArb?"arbitration_win":"classic_success"));
      setLegalRisk(r=>Math.max(0,r-5));
      setStats(s=>({...s,wins:s.wins+1}));
      track("CONTRACT_OUTCOME",{botId:selectedBot.id,method:"classic",success:true,profitLoss:recovered-courtFee-lawyerFee,durationSeconds:totalYears*365*86400,konkordatoTriggered:false,legalMode:isArb?"arbitration":"lawsuit",yearsSpent:totalYears});
      setOutcome({success:true,reward:recovered,profit:recovered-courtFee-lawyerFee,method:"classic",yearsSpent:totalYears,refunded:0,dialogue:pickRandom(selectedBot.dialogues.success)});
    } else {
      setTrustScores(s=>applyTrustUpdate(s,selectedBot.id,"lawsuit"));
      setLegalRisk(r=>Math.min(100,r+15));
      setDominoBump(d=>Math.min(d+DOMINO_FAILURE_BUMP,0.8));
      setStats(s=>({...s,losses:s.losses+1}));
      track("CONTRACT_OUTCOME",{botId:selectedBot.id,method:"classic",success:false,profitLoss:-(courtFee+lawyerFee),durationSeconds:totalYears*365*86400,konkordatoTriggered:konk,legalMode:isArb?"arbitration":"lawsuit",yearsSpent:totalYears});
      setOutcome({success:false,reward:0,profit:-(courtFee+lawyerFee),method:"classic",yearsSpent:totalYears,refunded:0,konkordato:konk,dialogue:pickRandom(selectedBot.dialogues.fail)});
    }
    const aut = computeAutopsy("classic",selectedBot,totalYears,won);
    setAutopsy(aut);
    setPhase("classic_result");
  }

  function handleAutopsyDone() {
    setPhase("cta");
  }

  function resetGame() {
    setPhase("select_bot");
    setSelectedBot(null);
    setChosenMethod(null);
    setScExecData(null);
    setContractId(null);
    setOutcome(null);
    setAutopsy(null);
    setKonkordato(false);
    setSelectedLawyer(null);
    setLegalMode("lawsuit");
    setCoinAnim(null);
  }

  function handleCTA(action) {
    if (action==="retry_sc"||action==="scenarios") { resetGame(); }
    else {
      // External CTA — would navigate to JusDigitalis.com pages
      console.log("CTA:",action);
    }
  }

  const classicLost = outcome && !outcome.success && outcome.method==="classic";
  const scSucceeded = outcome && outcome.success && outcome.method==="smart";

  const cardStyle = {background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.06)",borderRadius:20,padding:32,maxWidth:640,margin:"0 auto",position:"relative"};

  // ── Phase: select_bot ──
  if (phase==="select_bot") {
    return (
      <div style={cardStyle}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <h2 style={{color:"#e2e8f0",fontSize:22,marginBottom:8}}>Karşı Tarafı Seçin</h2>
          <p style={{color:"#718096",fontSize:13}}>Kim ile anlaşma yapacaksınız?</p>
          {abVariant==="forceClassicFirst" && (
            <div style={{marginTop:10,background:"rgba(255,107,53,.08)",border:"1px solid rgba(255,107,53,.2)",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#f6ad55"}}>
              Önce klasik yöntemi deneyin — ardından Smart Contract karşılaştırmasını görün.
            </div>
          )}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {BOTS.map(bot=>(
            <BotCard key={bot.id} bot={bot} trustScore={trustScores[bot.id]||50} selected={false} onSelect={handleBotSelect} disabled={false} />
          ))}
        </div>
      </div>
    );
  }

  // ── Phase: choose_method ──
  if (phase==="choose_method" && selectedBot) {
    const isAiVariant = abVariant==="aiAdvisorProminent";
    return (
      <div style={cardStyle}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <span style={{fontSize:40}}>{selectedBot.emoji}</span>
          <h2 style={{color:"#e2e8f0",fontSize:20,marginTop:8,marginBottom:4}}>{selectedBot.name}</h2>
          <div style={{color:"#718096",fontSize:13,marginBottom:4,fontStyle:"italic"}}>"{pickRandom(selectedBot.dialogues.greet)}"</div>
          {abVariant==="forceClassicFirst" && !hasPlayedClassic && (
            <div style={{marginTop:8,color:"#f6ad55",fontSize:12}}>Önce klasik yöntemi denemeniz gerekmektedir.</div>
          )}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <button
            onClick={()=>handleMethodChoice("classic")}
            style={{
              padding:"20px 16px",border:"2px solid rgba(255,107,53,.3)",borderRadius:14,cursor:"pointer",
              background:"rgba(255,107,53,.06)",color:"#e2e8f0",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,
              transition:"all .2s",
            }}
          >
            <div style={{fontSize:28,marginBottom:8}}>⚖️</div>
            <div>Klasik Sözleşme</div>
            <div style={{color:"#718096",fontSize:12,marginTop:6,fontWeight:400}}>Geleneksel yol — mahkeme, avukat, yıllar</div>
          </button>
          <button
            disabled={isMethodLocked}
            onClick={()=>handleMethodChoice("smart")}
            style={{
              padding:"20px 16px",border:`2px solid ${isMethodLocked?"rgba(255,255,255,.06)":"rgba(0,212,170,.4)"}`,borderRadius:14,
              cursor:isMethodLocked?"not-allowed":"pointer",opacity:isMethodLocked?.4:1,
              background:isMethodLocked?"transparent":"rgba(0,212,170,.08)",
              color:isMethodLocked?"#4a5568":"#e2e8f0",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,
              transition:"all .2s",
              boxShadow:!isMethodLocked&&isAiVariant?"0 0 30px rgba(0,212,170,.3)":"none",
            }}
          >
            {isAiVariant && !isMethodLocked && <div style={{fontSize:10,color:"#00d4aa",fontWeight:700,letterSpacing:1,marginBottom:4}}>✦ ÖNERİLEN</div>}
            <div style={{fontSize:28,marginBottom:8}}>⚡</div>
            <div>Smart Contract</div>
            <div style={{color:isMethodLocked?"#2d3748":"#718096",fontSize:12,marginTop:6,fontWeight:400}}>Otomatik icra — anında koruma</div>
          </button>
        </div>
        <button onClick={()=>setPhase("select_bot")} style={{marginTop:16,padding:"8px 20px",background:"transparent",border:"none",color:"#4a5568",cursor:"pointer",fontSize:13}}>← Bot Değiştir</button>
      </div>
    );
  }

  // ── Phase: sc_architect ──
  if (phase==="sc_architect" && selectedBot) {
    return (
      <div style={cardStyle}>
        <ContractModal
          bot={selectedBot}
          trustScore={trustScores[selectedBot.id]||50}
          onExecute={handleSCExecute}
          onBack={()=>setPhase("choose_method")}
          dominoBump={dominoBump}
          crashActive={crashActive}
        />
      </div>
    );
  }

  // ── Phase: sc_executing ──
  if (phase==="sc_executing") {
    return (
      <div style={{...cardStyle,textAlign:"center"}}>
        <div style={{width:60,height:60,border:"3px solid #00d4aa",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto 24px"}}/>
        <div style={{color:"#00d4aa",fontFamily:"'Space Mono',monospace",fontSize:13,marginBottom:8}}>KONTRAT KİLİTLENİYOR</div>
        <div style={{color:"#718096",fontSize:13}}>Blockchain doğrulama bekleniyor…</div>
        <div style={{marginTop:16,fontFamily:"'Space Mono',monospace",fontSize:11,color:"#4a5568"}}>{contractId}</div>
      </div>
    );
  }

  // ── Phase: classic_lawyer ──
  if (phase==="classic_lawyer" && selectedBot) {
    return (
      <div style={cardStyle}>
        <div style={{background:"rgba(255,107,53,.08)",border:"1px solid rgba(255,107,53,.2)",borderRadius:10,padding:14,marginBottom:20,fontSize:13,color:"#f6ad55"}}>
          <strong>{selectedBot.emoji} {selectedBot.name}:</strong> "{pickRandom(selectedBot.dialogues.fail)}"
        </div>
        <LawyerSelect bot={selectedBot} onSelect={handleLawyerSelect} />
      </div>
    );
  }

  // ── Phase: classic_tunnel ──
  if (phase==="classic_tunnel" && selectedBot && selectedLawyer) {
    const isArb = legalMode==="arbitration";
    return (
      <div style={cardStyle}>
        <TimeTunnel bot={selectedBot} lawyer={selectedLawyer} mode={legalMode} isArb={isArb} onComplete={handleTunnelComplete}/>
      </div>
    );
  }

  // ── Phase: sc_result ──
  if ((phase==="sc_result") && outcome) {
    const totalCost = scExecData?.totalCost||0;
    return (
      <div style={cardStyle}>
        {/* SC result card */}
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:52}}>{outcome.success?"✅":"🔄"}</div>
          <h3 style={{color:outcome.success?"#00d4aa":"#f39c12",fontSize:22,marginTop:8,marginBottom:4}}>
            {outcome.success?"Teslimat Başarılı":"Otomatik İade"}
          </h3>
          {!outcome.success && (
            <div style={{background:"rgba(0,212,170,.08)",border:"1px solid rgba(0,212,170,.2)",borderRadius:10,padding:12,marginTop:12,animation:"refundPop .5s ease-out"}}>
              <div style={{color:"#00d4aa",fontWeight:700,fontSize:16}}>🔒 Paran Güvende</div>
              <div style={{color:"#68d391",fontSize:13,marginTop:4}}>{outcome.refunded} JC anında iade edildi</div>
            </div>
          )}
        </div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"#4a5568",textAlign:"center",marginBottom:16}}>{contractId}</div>
        <LegalReceipt
          title="SMART CONTRACT ÖZETI"
          color="#00d4aa"
          entries={[
            {label:"Ödenen",value:`${totalCost} JC`},
            outcome.success
              ? {label:"Kazanılan",value:`${outcome.reward} JC`,accent:"#00d4aa",bold:true}
              : {label:"İade",value:`${outcome.refunded} JC`,accent:"#00d4aa",bold:true},
            {label:"Net",value:`${outcome.profit>=0?"+":""}${outcome.profit} JC`,accent:outcome.profit>=0?"#00d4aa":"#ff6b35",bold:true},
          ]}
          total={`${outcome.profit>=0?"+":""}${outcome.profit} JC`}
        />
        <div style={{marginTop:16,padding:14,borderRadius:10,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)"}}>
          <span style={{fontSize:20}}>{selectedBot.emoji}</span>
          <span style={{color:"#a0aec0",fontSize:13,marginLeft:8,fontStyle:"italic"}}>"{outcome.dialogue}"</span>
        </div>
        <button onClick={()=>setPhase("autopsy")} style={{width:"100%",marginTop:16,padding:"14px 0",background:"linear-gradient(135deg,#00d4aa,#0099ff)",border:"none",borderRadius:10,color:"#060a10",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer"}}>
          Ekonomik Analizi Gör →
        </button>
      </div>
    );
  }

  // ── Phase: classic_result ──
  if (phase==="classic_result" && outcome) {
    const courtFee = legalMode==="lawsuit" ? computeCourtFee(selectedBot.basePrice) : computeArbitrationFee(selectedBot.basePrice);
    const lawyerFee = selectedLawyer?.fee||0;
    return (
      <div style={{...cardStyle,animation:outcome.konkordato?"konkordatoFlash 1s ease-in-out 3":"none"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:52}}>{outcome.success?"🏆":outcome.konkordato?"💀":"😔"}</div>
          <h3 style={{color:outcome.success?"#00d4aa":outcome.konkordato?"#ff4444":"#f39c12",fontSize:22,marginTop:8,marginBottom:4}}>
            {outcome.success?"Dava Kazanıldı":outcome.konkordato?"Konkordato İlan Edildi":"Dava Kaybedildi"}
          </h3>
          <p style={{color:"#718096",fontSize:13}}>{outcome.yearsSpent} yıl sürdü</p>
          {outcome.konkordato && (
            <p style={{color:"#fc8181",fontSize:13,marginTop:8}}>
              <LegalTermTooltip termKey="konkordato">Konkordato</LegalTermTooltip>: karşı taraf mahkeme korumasına girdi.
            </p>
          )}
        </div>
        <LegalReceipt
          title="KLASİK YÖNTEM MALİYETİ"
          color="#ff6b35"
          entries={[
            {label:"Mahkeme / Tahkim Harcı",value:`${courtFee} JC`,accent:"#ff6b35"},
            {label:"Avukat Ücreti",value:`${lawyerFee} JC`,accent:"#ff6b35"},
            {label:"Süre",value:`${outcome.yearsSpent} yıl`},
            outcome.success
              ? {label:"Tahsil edilen",value:`${outcome.reward} JC`,accent:"#00d4aa",bold:true}
              : {label:"Tahsil edilen",value:"0 JC",accent:"#ff4444"},
            {label:"Enflasyon değer kaybı",value:`-${autopsy?.inflationLoss||0} JC`,accent:"#ff4444"},
          ]}
          total={`${outcome.profit>=0?"+":""}${outcome.profit} JC`}
        />
        <div style={{marginTop:16,padding:14,borderRadius:10,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)"}}>
          <span style={{fontSize:20}}>{selectedBot.emoji}</span>
          <span style={{color:"#a0aec0",fontSize:13,marginLeft:8,fontStyle:"italic"}}>"{outcome.dialogue}"</span>
        </div>
        <button onClick={()=>setPhase("autopsy")} style={{width:"100%",marginTop:16,padding:"14px 0",background:"linear-gradient(135deg,#ff6b35,#ff4444)",border:"none",borderRadius:10,color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer"}}>
          Smart Contract ile Karşılaştır →
        </button>
      </div>
    );
  }

  // ── Phase: autopsy ──
  if (phase==="autopsy" && autopsy && selectedBot) {
    return (
      <div style={cardStyle}>
        <EconomicAutopsy
          autopsy={autopsy}
          bot={selectedBot}
          method={outcome?.method||"classic"}
          onDone={handleAutopsyDone}
          sessionDurationMs={Date.now()-sessionStart}
        />
      </div>
    );
  }

  // ── Phase: cta ──
  if (phase==="cta") {
    return (
      <div style={cardStyle}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <h3 style={{color:"#e2e8f0",fontSize:22,marginBottom:8}}>Simülasyon Tamamlandı</h3>
          <div style={{display:"flex",gap:16,justifyContent:"center",color:"#718096",fontSize:13}}>
            <span>Oyunlar: {stats.wins+stats.losses}</span>
            <span>·</span>
            <span>SC: {stats.scUses}</span>
            <span>·</span>
            <span>Klasik: {stats.classicUses}</span>
          </div>
        </div>
        <SmartCTA classicLost={classicLost} scSucceeded={scSucceeded} sessionCount={sessionCount} onCTA={handleCTA}/>
        <button onClick={resetGame} style={{width:"100%",marginTop:12,padding:"12px 0",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"#a0aec0",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:14,cursor:"pointer"}}>
          Yeni Simülasyon Başlat →
        </button>
      </div>
    );
  }

  return null;
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const abVariant = useRef(getABVariant()).current;
  const persisted  = useRef(loadPersisted()).current;
  const sessionStart = useRef(Date.now()).current;

  const [activeModule, setActiveModule] = useState("full_simulation");
  const [scenarioToLoad, setScenarioToLoad] = useState(null);

  const [coins, setCoins]                     = useState(()=>persisted?.coins??INITIAL_COINS);
  const [trustScores, setTrustScores]         = useState(()=>persisted?.trustScores??initTrustScores());
  const [stats, setStats]                     = useState(()=>persisted?.stats??{wins:0,losses:0,scUses:0,classicUses:0});
  const [capitalProtected, setCapitalProtected] = useState(()=>persisted?.capitalProtected??0);
  const [legalRisk, setLegalRisk]             = useState(()=>persisted?.legalRisk??0);
  const [sessionCount]                        = useState(()=>{
    try{ const n=parseInt(localStorage.getItem("jd_session_count")||"0");
      localStorage.setItem("jd_session_count",String(n+1)); return n; }catch{ return 0; }
  });

  // Coin animation overlay
  const [coinAnim, setCoinAnim] = useState(null);

  // Persist on change
  useEffect(()=>{
    savePersisted({coins,trustScores,stats,capitalProtected,legalRisk});
  },[coins,trustScores,stats,capitalProtected,legalRisk]);

  // Session start analytics + exit intent
  useEffect(()=>{
    track("SESSION_START",{timestamp:Date.now(),userAgent:navigator.userAgent.slice(0,80),referrer:document.referrer.slice(0,80),abVariant});
    const handleExit = ()=>{
      track("EXIT_INTENT",{lastInteraction:activeModule,sessionDurationMs:Date.now()-sessionStart});
    };
    window.addEventListener("beforeunload",handleExit);
    return ()=>window.removeEventListener("beforeunload",handleExit);
  },[]);

  function handleScenarioLaunch(scenario) {
    setScenarioToLoad(scenario);
    setActiveModule("full_simulation");
  }

  const MODULES = [
    {id:"quick_demo",     label:"Quick Demo",      emoji:"⚡", desc:"30 sn"},
    {id:"full_simulation",label:"Tam Simülasyon",  emoji:"🎮", desc:"3-5 dk"},
    {id:"scenario_mode",  label:"Senaryo Modu",    emoji:"📋", desc:"5-7 dk"},
    {id:"comparison_tool",label:"Karşılaştır",     emoji:"📊", desc:"2 dk"},
  ];

  return (
    <JusErrorBoundary>
      <style>{GLOBAL_CSS}</style>
      <div style={{minHeight:"100vh",background:"#060a10",color:"#e2e8f0"}}>

        {/* Header */}
        <header style={{borderBottom:"1px solid rgba(255,255,255,.06)",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:22,color:"#00d4aa",letterSpacing:2}}>
              JUS DIGITALIS
              <span style={{fontFamily:"'Space Mono',monospace",color:"#4a5568",fontSize:12,marginLeft:8,fontWeight:400}}>v2.5</span>
            </div>
            <div style={{color:"#4a5568",fontSize:11,marginTop:2}}>Sandbox & Analytics Edition</div>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <SocialProofWidget/>
            <div style={{position:"relative"}}>
              <CoinDisplay coins={coins}/>
              {coinAnim && (
                <div key={coinAnim.id} style={{
                  position:"absolute",top:-10,right:0,
                  color:coinAnim.amount>0?"#00d4aa":"#ff4444",
                  fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:16,
                  animation:"fadeUp .7s ease-out forwards",pointerEvents:"none",whiteSpace:"nowrap",
                }}>
                  {coinAnim.amount>0?"+":""}{coinAnim.amount} JC
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Module Navigation */}
        <nav style={{borderBottom:"1px solid rgba(255,255,255,.06)",padding:"0 24px",display:"flex",gap:4,overflowX:"auto"}}>
          {MODULES.map(m=>(
            <button key={m.id} onClick={()=>{setActiveModule(m.id);setScenarioToLoad(null);}} style={{
              padding:"14px 20px",border:"none",background:"transparent",cursor:"pointer",
              color:activeModule===m.id?"#00d4aa":"#718096",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,
              borderBottom:`2px solid ${activeModule===m.id?"#00d4aa":"transparent"}`,
              transition:"all .2s",display:"flex",gap:6,alignItems:"center",whiteSpace:"nowrap",
            }}>
              <span>{m.emoji}</span>{m.label}
              <span style={{color:"#4a5568",fontSize:11,fontWeight:400}}>{m.desc}</span>
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main style={{padding:"32px 24px",maxWidth:760,margin:"0 auto"}}>

          {/* Stats bar */}
          {(stats.wins+stats.losses)>0 && (
            <div style={{display:"flex",gap:16,marginBottom:24,flexWrap:"wrap"}}>
              {[
                {label:"Kazanılan",value:stats.wins,color:"#00d4aa"},
                {label:"Kaybedilen",value:stats.losses,color:"#ff4444"},
                {label:"SC Kullanımı",value:stats.scUses,color:"#0099ff"},
                {label:"Korunan Sermaye",value:`${capitalProtected} JC`,color:"#9b59b6"},
              ].map((s,i)=>(
                <div key={i} style={{background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.06)",borderRadius:10,padding:"10px 16px"}}>
                  <div style={{color:s.color,fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:16}}>{s.value}</div>
                  <div style={{color:"#4a5568",fontSize:11}}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Module routing */}
          {activeModule==="quick_demo" && (
            <QuickDemo onBack={()=>setActiveModule("full_simulation")}/>
          )}

          {activeModule==="full_simulation" && (
            <FullSimulation
              abVariant={abVariant}
              coins={coins} setCoins={setCoins}
              trustScores={trustScores} setTrustScores={setTrustScores}
              stats={stats} setStats={setStats}
              capitalProtected={capitalProtected} setCapitalProtected={setCapitalProtected}
              legalRisk={legalRisk} setLegalRisk={setLegalRisk}
              sessionStart={sessionStart}
              sessionCount={sessionCount}
              preloadScenario={scenarioToLoad}
            />
          )}

          {activeModule==="scenario_mode" && (
            <ScenarioMode onLaunch={handleScenarioLaunch} onBack={()=>setActiveModule("full_simulation")}/>
          )}

          {activeModule==="comparison_tool" && (
            <ComparisonTool onBack={()=>setActiveModule("full_simulation")}/>
          )}

          {/* Legal terms footer */}
          <div style={{marginTop:48,paddingTop:24,borderTop:"1px solid rgba(255,255,255,.06)",display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center"}}>
            {Object.keys(LEGAL_TERMS).map(k=>(
              <LegalTermTooltip key={k} termKey={k}/>
            ))}
          </div>

          <div style={{textAlign:"center",marginTop:24,color:"#2d3748",fontSize:11,fontFamily:"'Space Mono',monospace"}}>
            JUS DIGITALIS v2.5 — Simülasyon amaçlıdır. Hukuki tavsiye niteliği taşımaz.
          </div>
        </main>
      </div>
    </JusErrorBoundary>
  );
}
