// ════════════════════════════════════════════════════════════════════════════
// JUS DIGITALIS v2.4 — Systemic Risk & Trustless Trust Sandbox
// "Boş Güven → Konkordato. Trustless Trust → Sermaye Koruması."
// ════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from "react";

// — MODULE: CONSTANTS —
const INITIAL_COINS        = 1000;
const ORACLE_FEE           = 30;
const COURT_FEE_RATE       = 0.05;
const ARBITRATION_FEE_RATE = 0.03;
const LEGAL_INTEREST_RATE  = 0.09;
const OPPORTUNITY_YIELD    = 0.25;   // yüksek getirili varlık (%25/yıl)
const MARKET_CRASH_PENALTY = 0.30;   // kriz başarı düşüşü
const MARKET_CRASH_CYCLES  = 2;
const KONKORDATO_CHANCE    = 0.15;
const DOMINO_FAILURE_BUMP  = 0.20;
const MAX_TRUST_SCORE      = 100;
const TRUST_DISCOUNT_MAX   = 20;     // maks %20 cezai şart indirimi

const INFLATION_BY_YEAR = {
  1:0.82,2:0.68,3:0.52,4:0.44,5:0.38,
  6:0.33,7:0.29,8:0.25,9:0.22,10:0.18,
};

const HONEST_FAILURE_REASONS = [
  "Beklenmedik ekonomik kriz nedeniyle şirket faaliyetlerini durdurdu.",
  "Tedarik zinciri çöktü — force majeure koşulları oluştu.",
  "Şirket tasfiyeye (Liquidation) girdi. Alacaklar sıraya alındı.",
  "Regülasyon değişikliği tedariki imkansız kıldı.",
];

const MARKET_VARIANCE = {
  honest:      { base:0.12, variance:0.18 },
  opportunist: { base:0.25, variance:0.40 },
  contractor:  { base:0.10, variance:0.22 },
};

const LAWSUIT_YEARS_BY_BOT      = { honest:3, opportunist:2, contractor:10 };
const ARBITRATION_YEARS_BY_BOT  = { honest:1, opportunist:1, contractor:2  };

// — MODULE: BOT DATA —
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

// — MODULE: LAWYER DATA —
const LAWYERS = [
  {
    id:"rookie", name:"Stajyer Avukat", title:"Az Tecrübeli · Az Ücretli",
    emoji:"👨‍🎓", color:"#a0aec0", fee:30, winMultiplier:0.28, recoveryRate:0.35,
    description:"Yeni mezun, hevesli ama deneyimsiz.",
    dialogues:["Ben bu davayı kazanabilirim! Hukuk fakültesinde birinci oldum.","Şimdi şöyle bir strateji düşündüm… bekleyin not alıyorum.","Daha önce böyle bir dava görmedim ama araştırırım!"],
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

// — MODULE: YEAR EVENTS —
const YEAR_EVENT_POOL = {
  1: {events:["Dilekçeler mahkemeye sunuldu.","Tebligatlar gönderildi.","İlk duruşma tarihi belirlendi."],winProb:0.35},
  2: {events:["Bilirkişi atandı.","Bilirkişi raporu hazırlandı.","Karşı taraf rapora itiraz etti."],winProb:0.42},
  3: {events:["Yargıtay'a taşındı.","Yargıtay bozma kararı verdi.","Yeniden yargılama başladı."],winProb:0.50},
  4: {events:["Keşif yapıldı.","Tanıklar dinlendi.","Ara karar verildi."],winProb:0.55},
  5: {events:["Uzlaşma görüşmeleri başarısız.","İstinaf mahkemesine gidildi.","İstinaf kararı bekleniyor."],winProb:0.58},
  6: {events:["Mahkeme dosyası tekrar incelendi.","Yeni bilirkişi atandı.","Teknik rapor istendi."],winProb:0.61},
  7: {events:["Hâkim değişikliği nedeniyle dosya yeniden açıldı.","Taraflar yeniden dinlendi.","Ek süre talep edildi."],winProb:0.63},
  8: {events:["Belediye kayıtları incelendi.","Kadastro müdürlüğünden yazı istendi.","Bilirkişi heyeti toplandı."],winProb:0.65},
  9: {events:["Yargıtay 2. bozma kararı verdi.","Dosya alt mahkemeye gönderildi.","Son duruşmaya hazırlık."],winProb:0.70},
  10: {events:["Karar duruşması yapıldı.","Hüküm açıklandı.","İlam kesinleşti."],winProb:0.75},
};
const ARB_EVENT_POOL = {
  1:{events:["Tahkim talebi iletildi.","Arabulucu atandı.","Taraflar görüşmeye çağrıldı."],winProb:0.60},
  2:{events:["Teknik değerlendirme tamamlandı.","Uzlaşı tutanağı imzalandı.","Karar açıklandı."],winProb:0.68},
};

function buildYearEvents(n, isArb=false) {
  const pool = isArb ? ARB_EVENT_POOL : YEAR_EVENT_POOL;
  return Array.from({length:n},(_,i)=>{const y=i+1;const d=pool[y]||pool[3];return{year:y,label:`${y}. YIL`,events:d.events,winProb:d.winProb};});
}

// — MODULE: MATH & ECONOMICS —
function genContractId() {
  return "JD-"+Math.random().toString(36).toUpperCase().slice(2,8)+"-"+Date.now().toString(36).toUpperCase().slice(-4);
}
function nowStr(){return new Date().toLocaleString("tr-TR");}
function getSessionTime(st){const s=Math.floor((Date.now()-st)/1000);return`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;}
function pickRandom(arr){return arr[Math.floor(Math.random()*arr.length)];}

function computeDynamicReward(bot,crashActive){
  const mv=MARKET_VARIANCE[bot.id]||{base:0.15,variance:0.20};
  let marketMod=(Math.random()-0.4)*mv.variance;
  if(crashActive) marketMod-=0.08;
  const profitRate=Math.max(0.02,mv.base+marketMod);
  const reward=Math.round(bot.basePrice*(1+profitRate));
  const delta=reward-bot.basePrice;
  const marketNote=marketMod>0.05?"📈 Piyasa lehte":marketMod<-0.05?"📉 Piyasa aleyhte":"";
  return{reward,delta,marketNote,profitRate};
}

function botEvaluateContract(bot,params,trustScore=50){
  const discount=Math.floor((trustScore/MAX_TRUST_SCORE)*TRUST_DISCOUNT_MAX);
  const effectivePenalty=Math.max(0,params.penaltyRate-discount);
  const harshness=(1-params.timeout/60)*0.5+(effectivePenalty/100)*0.5;
  if(harshness>bot.riskTolerance+0.4) return{refused:true,priceMultiplier:1,reason:"Şartlar çok sert — bot reddetti.",discount};
  if(harshness>bot.riskTolerance){
    const bump=1+bot.priceFlexibility+(harshness-bot.riskTolerance)*0.5;
    return{refused:false,priceMultiplier:parseFloat(bump.toFixed(2)),reason:`Bot sert şartlar için %${Math.round((bump-1)*100)} zam istedi.`,discount};
  }
  return{refused:false,priceMultiplier:1,reason:null,discount};
}

function computeSuccessRate(bot,params,crashActive,dominoBump=0){
  let rate=bot.baseSuccessRate;
  if(params.useOracle) rate=Math.min(rate+0.35,0.97);
  if(bot.id==="opportunist"&&params.timeout<15) rate=Math.max(rate-0.08,0);
  if(crashActive) rate=Math.max(rate-MARKET_CRASH_PENALTY,0.02);
  rate=Math.max(rate-dominoBump,0.02);
  return rate;
}

// Enhanced refund: inflation + legal interest + opportunity cost (25%/yr yield)
function computeEnhancedRefund(nominal,totalYears,won){
  const inflMult=INFLATION_BY_YEAR[totalYears]||0.18;
  const reel=Math.floor(nominal*inflMult);
  const legalInterestMult=won?Math.pow(1+LEGAL_INTEREST_RATE,totalYears):1;
  const withLegalInterest=won?Math.floor(reel*legalInterestMult):reel;
  const opportunityFinalValue=Math.floor(nominal*Math.pow(1+OPPORTUNITY_YIELD,totalYears));
  const opportunityCost=opportunityFinalValue-nominal;
  const netAfterOpportunity=withLegalInterest-opportunityCost;
  return{reel,withLegalInterest,opportunityCost,netAfterOpportunity,multiplier:inflMult,yearWon:totalYears,nominal,opportunityFinalValue};
}

function computeCourtFee(basePrice){return Math.round(basePrice*COURT_FEE_RATE);}
function computeArbitrationFee(basePrice){return Math.round(basePrice*ARBITRATION_FEE_RATE);}

// Economic Autopsy — compare chosen method vs alternatives
// NOTE v2.4 BUG: computeCourtFee(autopsy.inflationLoss) is wrong in EconomicAutopsy render —
// inflationLoss is not a price value. Fixed in v2.5 by passing basePrice prop.
function computeAutopsy(method,bot,result,totalYears,won,crashActive){
  const courtFee=computeCourtFee(bot.basePrice);
  const inflMult=INFLATION_BY_YEAR[totalYears]||1;
  const inflationLoss=Math.floor(bot.basePrice*(1-inflMult));
  const legalInterest=won?Math.floor(bot.basePrice*inflMult*(Math.pow(1.09,totalYears)-1)):0;
  const opportunityCost=Math.floor(bot.basePrice*(Math.pow(1+OPPORTUNITY_YIELD,totalYears)-1));
  const konkordatoRisk=Math.round(KONKORDATO_CHANCE*100);
  const scSaving=method!=="smart"?(inflationLoss+courtFee):0;
  return{
    method,
    courtFeeSaved:method==="smart"?courtFee:0,
    inflationLoss,
    legalInterestEarned:legalInterest,
    opportunityCostLost:opportunityCost,
    konkordatoRiskPct:konkordatoRisk,
    scSaving,
    summary:method==="smart"
      ?`Smart Contract seçerek 🪙 ${courtFee} harç + %${Math.round((1-inflMult)*100)} enflasyon kaybından + %${konkordatoRisk} konkordato riskinden korunuştunuz.`
      :`Klasik yöntem: 🪙 ${courtFee} harç + 🪙 ${inflationLoss} enflasyon kaybı + 🪙 ${opportunityCost} fırsat maliyeti oluştu.`,
  };
}

// — MODULE: REPUTATION —
function initTrustScores(){return Object.fromEntries(BOTS.map(b=>[b.id,50]));}

// NOTE v2.4 BUG: spread operator uses unicode ellipsis (…) instead of (...) — syntax error in some parsers
function applyTrustUpdate(scores,botId,event){
  const delta={sc_success:+8,sc_fail:-5,classic_success:+3,lawsuit:-10,arbitration_win:+2}[event]||0;
  return{...scores,[botId]:Math.max(0,Math.min(MAX_TRUST_SCORE,(scores[botId]||50)+delta))};
}

function getReputationBadge(score){
  if(score>=80) return{label:"Güvenilir",color:"#00d4aa"};
  if(score>=60) return{label:"Orta",color:"#f39c12"};
  if(score>=40) return{label:"Şüpheli",color:"#ff6b35"};
  return{label:"Riskli",color:"#ff4444"};
}

// — MODULE: GLOBAL STYLES —
const GLOBAL_CSS=`@import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Barlow+Condensed:wght@400;600;700;800;900&family=Syne:wght@400;700;800;900&display=swap'); *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;} body{font-family:'Syne',sans-serif;background:#060a10;} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}} @keyframes fadeUp{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-30px)}} @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}} @keyframes countUp{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}} @keyframes receiptIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} @keyframes bubbleIn{from{opacity:0;transform:scale(.8) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}} @keyframes lawyerPop{from{opacity:0;transform:translateY(20px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}} @keyframes lockPulse{0%,100%{box-shadow:0 0 20px rgba(0,212,170,.3)}50%{box-shadow:0 0 50px rgba(0,212,170,.7)}} @keyframes coinRain{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(60px) rotate(360deg);opacity:0}} @keyframes konkordatoFlash{0%,100%{background:rgba(255,68,68,.0)}50%{background:rgba(255,68,68,.15)}} @keyframes crashShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}} @keyframes winProbGrow{from{width:0}to{width:var(--wp)}} @keyframes glitch{0%,100%{clip-path:inset(0 0 98% 0)}20%{clip-path:inset(33% 0 33% 0)}40%{clip-path:inset(66% 0 10% 0)}60%{clip-path:inset(10% 0 66% 0)}80%{clip-path:inset(50% 0 30% 0)}} @keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(200%)}} @keyframes arbGlow{0%,100%{box-shadow:0 0 10px rgba(155,89,182,.2)}50%{box-shadow:0 0 30px rgba(155,89,182,.5)}} input[type=range]{-webkit-appearance:none;appearance:none;height:4px;border-radius:2px;background:transparent;width:100%;cursor:pointer;} input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#00d4aa;cursor:pointer;box-shadow:0 0 8px rgba(0,212,170,.5);} ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:rgba(0,212,170,.3);border-radius:2px;} .tooltip-wrap{position:relative;display:inline-flex;align-items:center;cursor:help;} .tooltip-wrap .tooltip-box{display:none;position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:#0d1b2a;border:1px solid rgba(0,212,170,.3);color:#cce;font-size:11px;line-height:1.6;padding:8px 12px;border-radius:8px;width:220px;z-index:999;pointer-events:none;} .tooltip-wrap:hover .tooltip-box{display:block;animation:bubbleIn .2s ease-out;}`;

// ── The remainder of v2.4 (CityGrid, CrashBanner, TrustlessDashboard, UI atoms,
//    BotCard, LawyerSelect, TimeTunnel, EconomicAutopsy, LegalReceipt,
//    ContractModal, App) is omitted here because the original paste was truncated
//    at the ContractModal result phase. The full working source is reconstructed
//    and all bugs are fixed in v2_5.jsx.
// ──────────────────────────────────────────────────────────────────────────────
