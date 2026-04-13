// ════════════════════════════════════════════════════════════════════════════
// JUS DIGITALIS v2.7 — Bankruptcy, Loans, Animations & Judge Edition
// Changes from v2.6:
// 1. Player bankruptcy/insolvency modal (below 100 JC)
// 2. Bot debt-request events + mini-lawsuit on default
// 3. Win confetti + loss red-flash animations
// 4. TimeTunnel: 2× slower, more immersive courtroom feel
// 5. Hakim Bey judge character — named, speaks each year, "yetersiz delil" lines
// ════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useMemo, memo, Component } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   PART 1 — CONSTANTS, DATA, MATH UTILS, CSS
   ═══════════════════════════════════════════════════════════════════════════ */

const INITIAL_COINS        = 1000;
const ORACLE_FEE           = 30;
const COURT_FEE_RATE       = 0.05;
const ARBITRATION_FEE_RATE = 0.03;
const LEGAL_INTEREST_RATE  = 0.09;
// v3a: Realistic Turkish market opportunity cost rates
const TK_OPPORTUNITY_BASE  = 0.40; // ~40% annual (BIST100 / TL mevduat blend, 2023-24 avg)
const TK_OPPORTUNITY_FLOOR = 0.22; // long-term normalized floor (post-stabilisation)
const MARKET_CRASH_PENALTY = 0.30;
const KONKORDATO_CHANCE    = 0.15;
const DOMINO_FAILURE_BUMP  = 0.20;
const DOMINO_RECOVERY      = 0.05;
const MAX_TRUST_SCORE      = 100;
const TRUST_DISCOUNT_MAX   = 20;
const LS_KEY               = "jus_digitalis_v27";
const BANKRUPTCY_THRESHOLD = 100;    // v2.7: insolvency trigger
const LOAN_TRIGGER_EVERY   = 5;      // v2.7: loan request every N contracts

const INFLATION_BY_YEAR = {
  1:0.82,2:0.68,3:0.52,4:0.44,5:0.38,
  6:0.33,7:0.29,8:0.25,9:0.22,10:0.18,
};
const MARKET_VARIANCE = {
  honest:      {base:0.12,variance:0.18},
  opportunist: {base:0.25,variance:0.40},
  contractor:  {base:0.10,variance:0.22},
};
// v3a: randomized lawsuit duration — min/max ranges per bot
const LAWSUIT_YEARS_BY_BOT     = {honest:{min:2,max:5}, opportunist:{min:1,max:4}, contractor:{min:6,max:10}};
const ARBITRATION_YEARS_BY_BOT = {honest:{min:1,max:2}, opportunist:{min:1,max:2}, contractor:{min:1,max:3}};

// ─── JUDGE CHARACTER DATA (v2.7) ─────────────────────────────────────────────
const JUDGE_NAME = "Hakim Bey";
const JUDGE_EMOJI = "👨‍⚖️";
// Per-year signature lines
const JUDGE_BY_YEAR = {
  1: ["Dosyanızı inceledim. Dava resmen açılmıştır.", "Taraflara tebligat gönderildi. Süreç başlıyor."],
  2: ["Bilirkişi atadım. Raporunu bekliyorum.", "Karşı tarafın itirazı kayıt altına alındı."],
  3: ["Yetersiz delil var. Ek belge ibraz edin.", "Yargıtay içtihatlarına bakılacak."],
  4: ["Tanık ifadeleri alındı. Değerlendirme aşamasındayım.", "Ara karar verdim — süreç devam ediyor."],
  5: ["Uzlaşma önerim vardı. Reddettiniz. Pekâlâ.", "İstinaf kararı geldi, inceliyorum."],
  6: ["Yeni bilirkişi atıyorum. Teknik rapor istiyorum.", "Dosya eksikleri giderilmeli. Son uyarı."],
  7: ["Ben bu dosyayı yeni devraldım. Baştan okuyorum.", "Tarafları yeniden dinleyeceğim. Sabır."],
  8: ["Kadastro belgeleriniz eksik. Müdürlükten yazı istedim.", "Bilirkişi heyeti tekrar toplandı."],
  9: ["Son fırsatınız: uzlaşmak ister misiniz? … Hayır mı? Pekâlâ.", "Dosya tamamlandı. Karar aşamasına geçiyorum."],
  10:["Kararımı açıklıyorum. Sessizlik lütfen.", "Yılların emeği bu an için. Hüküm açıklanıyor."],
};
// When win probability is ambiguous
const JUDGE_INCONCLUSIVE = [
  "Yetersiz delil. Karar ertelendi.",
  "Kanıtlar belirsiz. Süre uzatılıyor.",
  "Her iki tarafın da argümanı zayıf görünüyor.",
  "Bu dava uzayacak. İkimiz de sabredeceğiz.",
  "Dosya yetersiz. Ek süre tanıyorum.",
];
const JUDGE_WEAK = [
  "Dürüst olmak gerekirse davanız zayıf.",
  "Karşı tarafın delilleri daha güçlü.",
  "Avukatınızla tekrar görüşmenizi tavsiye ederim.",
];
const JUDGE_STRONG = [
  "Kanıtlarınız güçlü. Süreç sizin lehinize ilerliyor.",
  "Deliller açık. Devam edelim.",
  "Hukuki durumunuz oldukça iyi görünüyor.",
];

function getJudgeDialogue(year, winProb) {
  if (winProb < 0.45) return pickRandom(JUDGE_WEAK);
  if (winProb < 0.55) return pickRandom(JUDGE_INCONCLUSIVE);
  if (winProb >= 0.65) return pickRandom(JUDGE_STRONG);
  const pool = JUDGE_BY_YEAR[year] || JUDGE_BY_YEAR[3];
  return pickRandom(pool);
}

// ─── LEGAL TERMS ─────────────────────────────────────────────────────────────
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
    detail:"TBK md. 136. Oracle entegrasyonu ile force majeure koşulları zincir üstünde otomatik doğrulanabilir.",
    ref:"TBK md. 136",
  },
  oracle: {
    short:"Oracle",
    definition:"Blockchain dışındaki gerçek dünya verisini akıllı sözleşmeye aktaran köprü.",
    detail:"Döviz kuru, hava durumu, lojistik takip gibi verileri doğrulanabilir şekilde zincire taşır.",
    ref:"Blockchain Hukuku",
  },
  temerrut: {
    short:"Temerrüt",
    definition:"Borçlunun vadesinde ifa etmediği durum; alacaklıya ek haklar doğurur.",
    detail:"TBK md. 117. Temerrüt halinde yasal faiz işler (%9/yıl). Smart Contract'ta temerrüt anında otomatik ceza kesilir.",
    ref:"TBK md. 117",
  },
};

// ─── ANALYTICS ───────────────────────────────────────────────────────────────
const ANALYTICS_URL = "/api/sandbox-analytics";
let _aQueue = [];
(function loadOfflineQueue() {
  try { const raw = localStorage.getItem("jd_aq"); if (raw) { _aQueue = JSON.parse(raw); _flush(); } } catch {}
})();
function _flush() {
  if (!_aQueue.length) return;
  const batch = [..._aQueue]; _aQueue = [];
  try { localStorage.removeItem("jd_aq"); } catch {}
  fetch(ANALYTICS_URL, { method:"POST", headers:{"Content-Type":"application/json"}, keepalive:true, body:JSON.stringify({events:batch}) })
    .catch(() => { _aQueue = [...batch,..._aQueue]; try { localStorage.setItem("jd_aq",JSON.stringify(_aQueue)); } catch {} });
}
function track(eventName, data={}) {
  _aQueue.push({event:eventName,ts:Date.now(),...data});
  try { localStorage.setItem("jd_aq",JSON.stringify(_aQueue)); } catch {}
  _flush();
}

// ─── SIMULATION LOG (v3a) ──────────────────────────────────────────────────────
const SIM_LOG_KEY  = "jd_sim_log";
const SIM_LOG_MAX  = 100;
const _sessionId   = Math.random().toString(36).slice(2,10).toUpperCase();

function logSimulation(data) {
  const entry = { ts:Date.now(), sessionId:_sessionId, ...data };
  try {
    const raw = localStorage.getItem(SIM_LOG_KEY);
    const log = raw ? JSON.parse(raw) : [];
    log.push(entry);
    if (log.length > SIM_LOG_MAX) log.splice(0, log.length - SIM_LOG_MAX);
    localStorage.setItem(SIM_LOG_KEY, JSON.stringify(log));
  } catch {}
  // also queue for backend POST
  track("SIM_DATA", entry);
}

function getABVariant() {
  try { const v = localStorage.getItem("jd_ab"); if (v) return v; } catch {}
  const variants = ["forceClassicFirst","freeChoice","aiAdvisorProminent"];
  const v = variants[Math.floor(Math.random()*3)];
  try { localStorage.setItem("jd_ab",v); } catch {}
  return v;
}

function loadPersisted() { try { return JSON.parse(localStorage.getItem(LS_KEY)||"null"); } catch { return null; } }
function savePersisted(data) { try { localStorage.setItem(LS_KEY,JSON.stringify(data)); } catch {} }

// ─── BOT DATA ─────────────────────────────────────────────────────────────────
const BOTS = [
  {
    id:"honest", name:"Mehmet Yılmaz", title:"Güvenilir Tüccar",
    contractType:"İkili Ticaret Sözleşmesi", contractRef:"TBK md.207",
    loanRepayRate:0.82, loanAmount:80,
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
      loanRequest:["Sıkışık durumdayım. Küçük bir yardım… Geri öderim tabii.","Güvenin bana — her zaman sözümün eri oldum."],
      loanRepay:  ["İşte paranız — faizli. Güveni kötüye kullanmadım.","Söz vermiştim. Aldığınız gibi geri verdim."],
      loanDefault:["Allah'ım, elim ayağım tutmuyor. Dava açarsanız anlayışla karşılarım.","Elimde değildi. Ama haklarınızı ararsanız anlayış gösteririm."],
    },
  },
  {
    id:"opportunist", name:"Kerem Aslan", title:"Bağımsız Ajan",
    contractType:"Hizmet Sözleşmesi", contractRef:"TBK md.386",
    loanRepayRate:0.25, loanAmount:60,
    emoji:"🦊", color:"#ff6b35", colorRgb:"255,107,53",
    risk:"Yüksek Risk", riskColor:"#ff4444",
    basePrice:150, baseReward:420, baseSuccessRate:0.22, delay:2800,
    catchphrase:"Fiyat uygunsa… görüşürüz.",
    description:"Sözleşmede açık bulursa teslim etmez. Başardığında kâr yüksek.",
    riskTolerance:0.3, priceFlexibility:0.25, failureType:"fraud",
    dialogues:{
      greet:  ["Para peşin, teslimat… zaman içinde olur.","Sözleşmeye bak, her şey yazıyor."],
      smart:  ["Smart contract ha? İade ediliyor… ilginç.","Şartlar çok sert ama bakabiliriz."],
      success:["Görüyor musun? Ben de teslim ederim. Bazen.","Bugün şanslı günündü."],
      fail:   ["Teknik sorunlar çıktı. Anlarsın.","'Makul süre' diyordu. Ben de makul buldum."],
      loanRequest:["Kısa süreli bir nakit ihtiyacım var. Güvenilir bir teklif.","İş fırsatı çıktı. Yatırım dönecek sana."],
      loanRepay:  ["İşte paran. Şaşırdın mı?","Bazı şeyleri geri öderim. Bugün öyle bir gün."],
      loanDefault:["Maalesef olmadı. Mahkemede görüşürüz.","Para gitti. Dava açarsan savcıya anlat."],
    },
  },
  {
    id:"contractor", name:"İbrahim Çelik", title:"İnşaat & Proje Yöneticisi",
    contractType:"Eser Sözleşmesi", contractRef:"TBK md.470",
    loanRepayRate:0.55, loanAmount:100,
    emoji:"🏗️", color:"#3b82f6", colorRgb:"59,130,246",
    risk:"Orta Risk", riskColor:"#f39c12",
    basePrice:300, baseReward:370, baseSuccessRate:0.58, delay:2400,
    catchphrase:"Proje teslim edilir — ama inşaat gecikir, bu kanundur.",
    description:"Büyük işler alır. Teslim etse de piyasa kârı eritiyor. Davası 10 yıl sürer.",
    riskTolerance:0.5, priceFlexibility:0.15, failureType:"delay",
    dialogues:{
      greet:  ["Taşınmaz işi budur, her şey kademeli ilerler.","Projemiz hazır, ruhsatlar tamam."],
      smart:  ["Smart contract, taşınmazlarda mı? İlginç.","Ruhsat gecikmesi de ceza kapsamında mı?"],
      success:["Proje teslim. Biraz geciktik ama teslim ettik.","İnşaat böyle bir şeydir."],
      fail:   ["Belediye ruhsatı vermedi. Bizim elimizde değil.","Malzeme fiyatları üç katına çıktı."],
      loanRequest:["Nakit akışında geçici bir sorun var. Kısa vadeli borç.","Projeye malzeme alacağım. Geri ödeme garantiliyim."],
      loanRepay:  ["Proje sattı, işte paranız.","Söz verdim, ödedim. İnşaat gecikir ama borç ödemez."],
      loanDefault:["Malzeme fiyatları patladı. Nakit yok. Dava açabilirsiniz.","Zor bir dönem. Hukuki yolları kullanın."],
    },
  },
];

const LAWYERS = [
  { id:"rookie", name:"Stajyer Avukat", title:"Az Tecrübeli · Az Ücretli", emoji:"👨‍🎓", color:"#a0aec0", fee:30, winMultiplier:0.28, recoveryRate:0.35, description:"Yeni mezun, hevesli ama deneyimsiz.", dialogues:["Bu davayı kazanabilirim!","Şimdi şöyle bir strateji düşündüm…","Daha önce böyle bir dava görmedim ama araştırırım!"] },
  { id:"mid",    name:"Genç Ortak",    title:"Orta Tecrübe · Orta Ücret",  emoji:"👩‍💼", color:"#f39c12", fee:70, winMultiplier:0.52, recoveryRate:0.55, description:"3–5 yıllık deneyim.",               dialogues:["Yargıtay içtihatlarına göre tam olarak bu durumu kapsıyor!","Müvekkilim haklı!","Bu davayı %80 kazanırız. Ya da %60."] },
  { id:"veteran",name:"Kurt Avukat",   title:"Tecrübeli · Pahalı · Az Konuşur", emoji:"⚖️",  color:"#9b59b6", fee:140, winMultiplier:0.78, recoveryRate:0.72, description:"25 yıllık deneyim.",         dialogues:["Tamam.","Dosyayı inceledim. Kazanırız.","Karşı taraf zayıf.","Güvenin bana."] },
];

const RANDOM_EVENTS = [
  // Positive
  { id:"foreign_capital",  type:"positive", emoji:"💰", title:"Yabancı Sermaye Girişi",       description:"Yabancı yatırımcı güveni yükseldi. Hazineye 150 JC eklendi, ödüller +%15.",   effect:{rewardBonus:0.15,successBonus:0.08,coinBonus:150} },
  { id:"trade_deal",       type:"positive", emoji:"🤝", title:"Ticaret Anlaşması Bonusu",     description:"Yeni ikili ticaret anlaşması imzalandı. Tüm başarı oranları +%10.",           effect:{successBonus:0.10,dominoBumpReduce:0.10} },
  { id:"tech_boom",        type:"positive", emoji:"💻", title:"Teknoloji Yatırım Dalgası",    description:"Blockchain altyapısına rekor yatırım. Smart Contract başarısı +%15.",         effect:{scSuccessBonus:0.15,coinBonus:80} },
  { id:"credit_subsidy",   type:"positive", emoji:"🏛️", title:"Hazine Kredi Desteği",        description:"Devlet KOBİ destek paketi açıkladı. Hazineye 100 JC eklendi.",              effect:{coinBonus:100,successBonus:0.05} },
  // Negative
  { id:"pandemic_shock",   type:"negative", emoji:"🦠", title:"Pandemi Şoku",                 description:"Salgın piyasaları sarstı. Başarı oranları düştü, piyasa krizi aktif.",        effect:{crashActive:true} },
  { id:"supply_crisis",    type:"negative", emoji:"🚚", title:"Tedarik Zinciri Krizi",        description:"Global lojistik kriz. Tüm teslimat süreleri 2 katına çıktı.",                effect:{deliveryTimeMult:2.0,dominoBump:0.10} },
  { id:"currency_crash",   type:"negative", emoji:"💸", title:"Döviz Krizi",                  description:"TL değer kaybetti. Sözleşme ödülleri -%20, fırsat maliyeti arttı.",          effect:{rewardPenalty:0.20,dominoBump:0.05} },
  { id:"supply_chain",     type:"negative", emoji:"⛓️", title:"Tedarik Zinciri Çöküşü",      description:"Global tedarik zinciri aksadı. Botların teslim ihtimali azaldı.",             effect:{dominoBump:0.15} },
];

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
  return Array.from({length:n},(_,i)=>{ const y=i+1; const d=pool[y]||pool[3]; return {year:y,events:d.events,winProb:d.winProb}; });
}

// ─── MATH ────────────────────────────────────────────────────────────────────
function genContractId(){ return "JD-"+Math.random().toString(36).toUpperCase().slice(2,8)+"-"+Date.now().toString(36).toUpperCase().slice(-4); }
function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function computeDynamicReward(bot, crashActive, eventEffect=null) {
  const mv = MARKET_VARIANCE[bot.id]||{base:0.15,variance:0.20};
  let marketMod = (Math.random()-0.4)*mv.variance;
  if (crashActive) marketMod -= 0.08;
  const profitRate = Math.max(0.02, mv.base+marketMod);
  let reward = Math.round(bot.basePrice*(1+profitRate));
  if (eventEffect?.rewardBonus)  reward = Math.round(reward*(1+eventEffect.rewardBonus));
  if (eventEffect?.rewardPenalty) reward = Math.round(reward*(1-eventEffect.rewardPenalty));
  return {reward, delta:reward-bot.basePrice, profitRate};
}

function botEvaluateContract(bot, params, trustScore=50) {
  const discount = Math.floor((trustScore/MAX_TRUST_SCORE)*TRUST_DISCOUNT_MAX);
  const effectivePenalty = Math.max(0, params.penaltyRate-discount);
  const harshness = (1-params.timeout/60)*0.5+(effectivePenalty/100)*0.5;
  if (harshness > bot.riskTolerance+0.4) return {refused:true,priceMultiplier:1,reason:"Şartlar çok sert — bot reddetti.",discount,effectivePenalty};
  if (harshness > bot.riskTolerance) { const bump=1+bot.priceFlexibility+(harshness-bot.riskTolerance)*0.5; return {refused:false,priceMultiplier:parseFloat(bump.toFixed(2)),reason:`Bot sert şartlar için %${Math.round((bump-1)*100)} zam istedi.`,discount,effectivePenalty}; }
  return {refused:false,priceMultiplier:1,reason:null,discount,effectivePenalty};
}

function computeSuccessRate(bot, params, crashActive, dominoBump=0, eventEffect=null) {
  let rate = bot.baseSuccessRate;
  if (params.useOracle) rate = Math.min(rate+0.35,0.97);
  if (bot.id==="opportunist"&&params.timeout<15) rate = Math.max(rate-0.08,0);
  if (crashActive) rate = Math.max(rate-MARKET_CRASH_PENALTY,0.02);
  rate = Math.max(rate-dominoBump,0.02);
  if (eventEffect?.successBonus)   rate = Math.min(rate+eventEffect.successBonus,0.97);
  if (eventEffect?.scSuccessBonus) rate = Math.min(rate+eventEffect.scSuccessBonus*0.6,0.97); // SC-specific bonus (partial for non-SC methods)
  return rate;
}

function computeClassicDirectRate(bot, crashActive, eventEffect=null) {
  let rate = bot.baseSuccessRate*(crashActive?0.50:0.75);
  if (eventEffect?.successBonus) rate = Math.min(rate+eventEffect.successBonus*0.5,0.92);
  if (eventEffect?.crashActive) rate *= 0.5;
  return Math.max(rate,0.02);
}

function computeCourtFee(p){ return Math.round(p*COURT_FEE_RATE); }
function computeArbitrationFee(p){ return Math.round(p*ARBITRATION_FEE_RATE); }
// price inflated to a given simulation year (base year = LAWSUIT_START_YEAR = 2021)
function priceAtSimYear(base, simYear, rate=0.09) {
  const years = Math.max(0, simYear - LAWSUIT_START_YEAR);
  return Math.round(base * Math.pow(1 + rate, years));
}

function computeAutopsy(method, bot, totalYears, won) {
  const bp = bot.basePrice;
  const courtFee = computeCourtFee(bp);
  const inflMult = INFLATION_BY_YEAR[Math.max(1,Math.min(totalYears,10))]||0.18;
  const inflationLoss = Math.floor(bp*(1-inflMult));
  // v3a: realistic Turkish market opportunity cost — high rate (BIST/TL bond blend) that moderates over time
  const yrs = Math.max(totalYears,1);
  const annualRate = Math.max(TK_OPPORTUNITY_BASE - (yrs-1)*0.025, TK_OPPORTUNITY_FLOOR);
  const opportunityCost = Math.floor(bp*(Math.pow(1+annualRate,yrs)-1));
  const konkordatoRisk = Math.round(KONKORDATO_CHANCE*100);
  // v3a: show inflation loss ONLY on win (recovered value eroded); opportunity cost ONLY on loss (capital tied up with no return)
  const showInflLoss   = won && totalYears>0;
  const showOppCost    = !won && totalYears>0;
  const effectiveInflLoss = showInflLoss ? inflationLoss : 0;
  const effectiveOppCost  = showOppCost  ? opportunityCost : 0;
  return {
    method, won, courtFee, inflationLoss, opportunityCost, konkordatoRisk,
    showInflLoss, showOppCost,
    scSaving: method!=="smart" ? (inflationLoss+courtFee) : 0,
    totalClassicLoss: courtFee+effectiveInflLoss+effectiveOppCost,
    annualRatePct: Math.round(annualRate*100),
    summary: method==="smart"
      ? `Smart Contract seçerek ${courtFee} JC harç + %${Math.round((1-inflMult)*100)} enflasyon kaybından korunuştunuz.`
      : totalYears===0 ? `Klasik sözleşme başarıyla tamamlandı — karşı taraf yükümlülüğünü yerine getirdi.`
      : won
        ? `Davayı kazandınız — ancak ${totalYears} yılda paranın değeri %${Math.round((1-inflMult)*100)}'e düştü (enflasyon kaybı: ${inflationLoss} JC).`
        : `Dava kaybedildi. ${totalYears} yılda ${opportunityCost} JC fırsat maliyeti oluştu (%${Math.round(annualRate*100)} yıllık getiri kaçırıldı).`,
  };
}

function computeOpportunityCostHuman(jc) { const h=Math.round(jc/12); return {hours:h,weeks:(h/40).toFixed(1)}; }

function initTrustScores(){ return Object.fromEntries(BOTS.map(b=>[b.id,50])); }
function applyTrustUpdate(scores, botId, event) {
  const delta = {sc_success:+8,sc_fail:-5,classic_success:+3,lawsuit:-10,arbitration_win:+2}[event]||0;
  return {...scores,[botId]:Math.max(0,Math.min(MAX_TRUST_SCORE,(scores[botId]||50)+delta))};
}
function getReputationBadge(s) {
  if (s>=80) return {label:"Güvenilir",color:"#00d4aa"};
  if (s>=60) return {label:"Orta",color:"#f39c12"};
  if (s>=40) return {label:"Şüpheli",color:"#ff6b35"};
  return {label:"Riskli",color:"#ff4444"};
}
function computePlayerReputation(scores) {
  const vals=Object.values(scores); if (!vals.length) return 50;
  return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Barlow+Condensed:wght@400;600;700;800;900&family=Syne:wght@400;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Syne',sans-serif;background:#060a10;color:#e2e8f0;}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes fadeUp{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-40px)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes countUp{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}
@keyframes receiptIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes bubbleIn{from{opacity:0;transform:scale(.8) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes lawyerPop{from{opacity:0;transform:translateY(20px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes konkordatoFlash{0%,100%{background:rgba(255,68,68,.0)}50%{background:rgba(255,68,68,.15)}}
@keyframes slideIn{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
@keyframes refundPop{0%{opacity:0;transform:scale(0.6)}60%{transform:scale(1.15)}100%{opacity:1;transform:scale(1)}}
@keyframes eventIn{from{opacity:0;transform:scale(.92) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
/* v2.7 new animations */
@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}85%{opacity:.8}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}
@keyframes winFlash{0%,100%{box-shadow:none}25%{box-shadow:0 0 0 3px rgba(0,212,170,.5),0 0 60px rgba(0,212,170,.25)}75%{box-shadow:0 0 0 2px rgba(0,212,170,.3)}}
@keyframes lossFlash{0%,100%{background:rgba(6,10,16,0)}20%{background:rgba(255,68,68,.18)}60%{background:rgba(255,68,68,.08)}}
@keyframes judgeIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
@keyframes insolvencyIn{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
@keyframes loanIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:.4;transform:scale(.85)}50%{opacity:1;transform:scale(1)}}
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
   PART 2 — CORE UI ATOMS
   ═══════════════════════════════════════════════════════════════════════════ */

class JusErrorBoundary extends Component {
  constructor(props){super(props);this.state={hasError:false,errorMsg:""};}
  static getDerivedStateFromError(err){return {hasError:true,errorMsg:err?.message||"Bilinmeyen hata"};}
  componentDidCatch(err,info){track("ERROR",{message:err?.message,stack:info?.componentStack?.slice(0,200)});}
  handleReset(){try{localStorage.removeItem(LS_KEY);}catch{}window.location.reload();}
  render(){
    if(!this.state.hasError) return this.props.children;
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#060a10",flexDirection:"column",gap:24,padding:32}}>
        <div style={{fontSize:48}}>⚠️</div>
        <div style={{fontFamily:"'Space Mono',monospace",color:"#ff4444",fontSize:14,textAlign:"center"}}>Sistem Hatası<br/><span style={{color:"#666",fontSize:11}}>{this.state.errorMsg}</span></div>
        <button onClick={()=>this.handleReset()} style={{padding:"12px 28px",background:"#00d4aa",color:"#060a10",border:"none",borderRadius:8,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer"}}>Sıfırla ve Yeniden Başla</button>
      </div>
    );
  }
}

const CoinDisplay = memo(function CoinDisplay({coins}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(0,212,170,.1)",border:"1px solid rgba(0,212,170,.3)",borderRadius:12,padding:"8px 16px"}}>
      <span style={{fontSize:18}}>🪙</span>
      <span style={{fontFamily:"'Space Mono',monospace",color:"#00d4aa",fontWeight:700,fontSize:18,letterSpacing:1}}>{coins.toLocaleString("tr-TR")}</span>
      <span style={{color:"#4a5568",fontSize:11}}>JC</span>
    </div>
  );
});

const PlayerReputationDisplay = memo(function PlayerReputationDisplay({score}) {
  const badge = getReputationBadge(score);
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,.04)",border:`1px solid ${badge.color}44`,borderRadius:12,padding:"8px 14px"}}>
      <span style={{fontSize:16}}>🏅</span>
      <div>
        <div style={{fontFamily:"'Space Mono',monospace",color:badge.color,fontWeight:700,fontSize:13,letterSpacing:1}}>{score}/100</div>
        <div style={{color:"#4a5568",fontSize:10,lineHeight:1}}>{badge.label}</div>
      </div>
    </div>
  );
});

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
          {term.definition}<br/>
          <span style={{color:"rgba(0,212,170,.6)",fontSize:10}}>{term.ref}</span><br/>
          <span style={{color:"#00d4aa",fontSize:10,cursor:"pointer",textDecoration:"underline"}} onClick={e=>{e.stopPropagation();setShowModal(true);}}>Daha fazla bilgi →</span>
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

// ─── CONFETTI OVERLAY (v2.7) ──────────────────────────────────────────────────
function ConfettiOverlay({onDone}) {
  const pieces = useMemo(()=>Array.from({length:52},(_,i)=>({
    id:i,
    x:Math.random()*100,
    delay:Math.random()*0.7,
    size:5+Math.floor(Math.random()*9),
    color:["#00d4aa","#0099ff","#f39c12","#9b59b6","#ff6b35","#68d391","#fbbf24"][i%7],
    rotate:Math.floor(Math.random()*360),
    dur:1.5+Math.random()*1.0,
    isCircle:i%5===0,
  })),[]);

  useEffect(()=>{ const t=setTimeout(onDone,3000); return ()=>clearTimeout(t); },[]);

  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:800,overflow:"hidden"}}>
      {pieces.map(p=>(
        <div key={p.id} style={{
          position:"absolute",
          top:-14,
          left:`${p.x}%`,
          width:p.size,
          height:p.size,
          background:p.color,
          borderRadius:p.isCircle?"50%":"2px",
          transform:`rotate(${p.rotate}deg)`,
          animation:`confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
        }}/>
      ))}
    </div>
  );
}

// ─── INSOLVENCY MODAL (v2.7) ──────────────────────────────────────────────────
function InsolvencyModal({coins, onConcordato, onBankruptcy}) {
  const concordatoLoss = Math.floor(coins*0.30);
  const remaining = coins - concordatoLoss;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:1500,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{
        background:"#0d1117",
        border:"2px solid rgba(255,68,68,.6)",
        borderRadius:20,padding:36,maxWidth:500,width:"100%",textAlign:"center",
        animation:"insolvencyIn .5s cubic-bezier(.34,1.56,.64,1)",
        boxShadow:"0 0 60px rgba(255,68,68,.15)",
      }}>
        <div style={{fontSize:64,marginBottom:12}}>🏦</div>
        <div style={{color:"#ff4444",fontFamily:"'Space Mono',monospace",fontSize:11,letterSpacing:3,marginBottom:8,fontWeight:700}}>
          ⚠️ İFLAS TEHDİDİ
        </div>
        <h2 style={{color:"#e2e8f0",fontSize:24,marginBottom:12}}>Nakit Sıkıntısı</h2>
        <p style={{color:"#a0aec0",fontSize:14,lineHeight:1.7,marginBottom:8}}>
          Bakiyeniz <strong style={{color:"#ff4444"}}>{coins} JC</strong>'ye düştü — iflas eşiğinin altındasınız.
        </p>
        <p style={{color:"#718096",fontSize:13,marginBottom:28}}>
          İki seçeneğiniz var:
        </p>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
          {/* Concordato option */}
          <div style={{background:"rgba(243,156,18,.06)",border:"1px solid rgba(243,156,18,.3)",borderRadius:14,padding:20}}>
            <div style={{fontSize:32,marginBottom:8}}>🤝</div>
            <div style={{color:"#f39c12",fontWeight:700,fontSize:15,marginBottom:6}}>Konkordato</div>
            <p style={{color:"#a0aec0",fontSize:12,lineHeight:1.6,marginBottom:12}}>
              Alacaklılarla anlaşın. <strong style={{color:"#ff6b35"}}>{concordatoLoss} JC</strong> kaybedin, oyuna devam edin.
            </p>
            <div style={{background:"rgba(243,156,18,.08)",borderRadius:8,padding:"6px 10px",fontSize:11,color:"#f39c12",marginBottom:12}}>
              TİK md. 285 uyarınca<br/>Bakiyeniz: {Math.max(remaining, BANKRUPTCY_THRESHOLD+50)} JC
            </div>
            <button onClick={onConcordato} style={{width:"100%",padding:"10px 0",background:"linear-gradient(135deg,#f39c12,#e67e22)",border:"none",borderRadius:8,color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>
              Konkordato İlan Et
            </button>
          </div>

          {/* Bankruptcy option */}
          <div style={{background:"rgba(255,68,68,.06)",border:"1px solid rgba(255,68,68,.3)",borderRadius:14,padding:20}}>
            <div style={{fontSize:32,marginBottom:8}}>💀</div>
            <div style={{color:"#ff4444",fontWeight:700,fontSize:15,marginBottom:6}}>İflas</div>
            <p style={{color:"#a0aec0",fontSize:12,lineHeight:1.6,marginBottom:12}}>
              Her şeyi sıfırlayın. <strong style={{color:"#00d4aa"}}>{INITIAL_COINS} JC</strong> ile yeniden başlayın.
            </p>
            <div style={{background:"rgba(255,68,68,.08)",borderRadius:8,padding:"6px 10px",fontSize:11,color:"#fc8181",marginBottom:12}}>
              Tüm itibar ve istatistikler<br/>sıfırlanır
            </div>
            <button onClick={onBankruptcy} style={{width:"100%",padding:"10px 0",background:"rgba(255,68,68,.15)",border:"1px solid rgba(255,68,68,.4)",borderRadius:8,color:"#ff4444",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>
              İflas İlan Et
            </button>
          </div>
        </div>

        <p style={{color:"#2d3748",fontSize:11,fontFamily:"'Space Mono',monospace"}}>
          Bu karar geri alınamaz.
        </p>
      </div>
    </div>
  );
}

// ─── LOAN REQUEST MODAL (v2.7) ────────────────────────────────────────────────
function LoanRequestModal({request, coins, onLend, onRefuse}) {
  const {bot, amount} = request;
  const canAfford = coins >= amount;
  const interest = Math.floor(amount * 0.12);
  const repayChancePct = Math.round(bot.loanRepayRate * 100);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.78)",zIndex:1200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{
        background:"#0d1b2a",
        border:`2px solid rgba(${bot.colorRgb},.4)`,
        borderRadius:20,padding:32,maxWidth:460,width:"100%",
        animation:"loanIn .4s ease-out",
      }}>
        <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:20}}>
          <span style={{fontSize:44}}>{bot.emoji}</span>
          <div>
            <div style={{color:"#e2e8f0",fontWeight:700,fontSize:17}}>{bot.name}</div>
            <div style={{color:"#718096",fontSize:12}}>{bot.title}</div>
          </div>
        </div>

        <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.08)",borderRadius:12,padding:16,marginBottom:20}}>
          <p style={{color:"#e2e8f0",fontSize:14,lineHeight:1.7,fontStyle:"italic"}}>
            "{pickRandom(bot.dialogues.loanRequest)}"
          </p>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
          {[
            {label:"Talep Edilen",value:`${amount} JC`,color:"#f39c12"},
            {label:"Geri Ödeme Şansı",value:`%${repayChancePct}`,color:bot.loanRepayRate>0.6?"#00d4aa":bot.loanRepayRate>0.4?"#f39c12":"#ff4444"},
            {label:"Faiz",value:`+${interest} JC`,color:"#0099ff"},
          ].map((d,i)=>(
            <div key={i} style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
              <div style={{color:d.color,fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:15}}>{d.value}</div>
              <div style={{color:"#4a5568",fontSize:10,marginTop:2}}>{d.label}</div>
            </div>
          ))}
        </div>

        {!canAfford && (
          <div style={{background:"rgba(255,68,68,.06)",border:"1px solid rgba(255,68,68,.2)",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#fc8181",marginBottom:14}}>
            ⚠️ Bakiyeniz yetersiz. Borç vermeye uygun değilsiniz.
          </div>
        )}

        <div style={{background:"rgba(255,107,53,.06)",border:"1px solid rgba(255,107,53,.15)",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#f6ad55",marginBottom:20}}>
          ⚠️ Ödeme yapılmazsa mini dava süreci başlar. Kısmi tahsilat sağlanabilir.
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <button onClick={onRefuse} style={{padding:"12px 0",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"#a0aec0",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:14,cursor:"pointer"}}>
            Reddet
          </button>
          <button disabled={!canAfford} onClick={()=>onLend(amount,interest)} style={{
            padding:"12px 0",border:"none",borderRadius:10,fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,
            cursor:canAfford?"pointer":"not-allowed",
            background:canAfford?`linear-gradient(135deg,rgba(${bot.colorRgb},1),rgba(${bot.colorRgb},.7))`:"rgba(255,255,255,.05)",
            color:canAfford?"#060a10":"#4a5568",
          }}>
            {canAfford ? `${amount} JC Ver` : "Yetersiz Bakiye"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MINI LAWSUIT MODAL — loan default (v2.7) ─────────────────────────────────
function MiniLawsuitModal({bot, loanAmount, onComplete}) {
  const [phase, setPhase] = useState("opening"); // opening → verdict
  const [won, setWon] = useState(false);
  const courtFee = Math.round(loanAmount * 0.06);
  const recover = Math.round(loanAmount * 0.48);

  useEffect(()=>{
    const t = setTimeout(()=>{
      const result = Math.random() < 0.40; // 40% win on loan default lawsuit
      setWon(result);
      setPhase("verdict");
    }, 2400);
    return ()=>clearTimeout(t);
  },[]);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",zIndex:1300,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:"#0d1b2a",border:"2px solid rgba(255,107,53,.4)",borderRadius:20,padding:32,maxWidth:420,width:"100%",textAlign:"center"}}>
        {phase==="opening" && (
          <>
            <div style={{fontSize:52,marginBottom:12}}>⚖️</div>
            <div style={{color:"#f39c12",fontFamily:"'Space Mono',monospace",fontSize:11,letterSpacing:2,marginBottom:8}}>MİNİ DAVA — BORÇ TAHSİLATI</div>
            <h3 style={{color:"#e2e8f0",fontSize:20,marginBottom:12}}>{bot.name} mahkemede</h3>
            <p style={{color:"#a0aec0",fontSize:13,lineHeight:1.7,marginBottom:20}}>
              {loanAmount} JC'lik alacak için dava açıldı.<br/>
              Mahkeme harcı: <strong style={{color:"#ff6b35"}}>{courtFee} JC</strong>
            </p>
            <div style={{display:"flex",gap:8,justifyContent:"center",alignItems:"center",color:"#4a5568",fontSize:13}}>
              <div style={{width:12,height:12,border:"2px solid #f39c12",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
              Duruşma devam ediyor…
            </div>
          </>
        )}
        {phase==="verdict" && (
          <div style={{animation:"countUp .5s ease-out"}}>
            <div style={{fontSize:52,marginBottom:12}}>{won?"🏆":"😔"}</div>
            <h3 style={{color:won?"#00d4aa":"#ff4444",fontSize:22,marginBottom:8}}>
              {won?"Kısmi Tahsilat":"Dava Kaybedildi"}
            </h3>
            <p style={{color:"#a0aec0",fontSize:13,lineHeight:1.7,marginBottom:8}}>
              {won
                ? `Mahkeme ${recover} JC tahsilatına hükmetti. Mahkeme harcı: ${courtFee} JC.`
                : `Dava reddedildi. Mahkeme harcı: ${courtFee} JC ekstra kayıp.`
              }
            </p>
            <div style={{background:won?"rgba(0,212,170,.08)":"rgba(255,68,68,.08)",border:`1px solid ${won?"rgba(0,212,170,.3)":"rgba(255,68,68,.2)"}`,borderRadius:10,padding:12,marginBottom:16}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:18,color:won?"#00d4aa":"#ff4444"}}>
                {won?`+${recover-courtFee} JC net`:`-${courtFee} JC`}
              </div>
            </div>
            <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:"#718096",fontStyle:"italic"}}>
              {JUDGE_EMOJI} {JUDGE_NAME}: "{won?"Alacak kısmen ispat edildi. Tahsilata hükmediyorum.":"Delil yetersiz. Dava reddedildi."}"
            </div>
            <button onClick={()=>onComplete({won,recover,courtFee})} style={{width:"100%",padding:"12px 0",background:won?"linear-gradient(135deg,#00d4aa,#0099ff)":"rgba(255,255,255,.1)",border:"none",borderRadius:10,color:won?"#060a10":"#e2e8f0",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer"}}>
              Devam Et →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DELIVERY SHIPPING (v3b) — bilateral trade animation ─────────────────────
function DeliveryShipping({bot, deliveryTimeMult=1, onDelivered, onFailed, willSucceed}) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const totalDuration = 3200 * deliveryTimeMult; // 3.2 s base, doubled in crisis

  const stages = [
    {pct:0,  text:"Sipariş hazırlanıyor…", emoji:"📋"},
    {pct:25, text:"Kargo yola çıktı…",    emoji:"🚚"},
    {pct:55, text:"Teslim noktasında…",   emoji:"📦"},
    {pct:80, text:"Teslim alınıyor…",     emoji:"🖊️"},
  ];
  const stage = [...stages].reverse().find(s=>progress>=s.pct) || stages[0];

  useEffect(()=>{
    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const prog = Math.min((elapsed/totalDuration)*100, 100);
      setProgress(Math.round(prog));
      if (prog < 100) { rafRef.current = requestAnimationFrame(animate); }
      else { setDone(true); }
    };
    rafRef.current = requestAnimationFrame(animate);
    return ()=>{ if(rafRef.current) cancelAnimationFrame(rafRef.current); };
  },[]);

  if (done) {
    if (willSucceed) return (
      <div style={{textAlign:"center",animation:"countUp .5s ease-out"}}>
        <div style={{fontSize:56,marginBottom:12}}>📦</div>
        <h3 style={{color:"#00d4aa",fontSize:22,marginBottom:8}}>Kargo Teslim Edildi</h3>
        <p style={{color:"#718096",fontSize:14,marginBottom:8}}>{bot.name} malı teslim etti ve imzanızı bekliyor.</p>
        <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.08)",borderRadius:10,padding:12,marginBottom:20,fontSize:13,color:"#a0aec0",fontStyle:"italic"}}>
          {bot.emoji} "{pickRandom(bot.dialogues.success)}"
        </div>
        <button onClick={onDelivered} style={{width:"100%",padding:"14px 0",background:"linear-gradient(135deg,#00d4aa,#0099ff)",border:"none",borderRadius:10,color:"#060a10",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer"}}>
          ✅ Teslim Aldım — Onayla
        </button>
      </div>
    );
    return (
      <div style={{textAlign:"center",animation:"countUp .5s ease-out"}}>
        <div style={{fontSize:56,marginBottom:12}}>❌</div>
        <h3 style={{color:"#ff4444",fontSize:22,marginBottom:8}}>Teslimat Başarısız</h3>
        <p style={{color:"#718096",fontSize:14,marginBottom:8}}>{bot.name} yükümlülüğünü yerine getirmedi.</p>
        <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.08)",borderRadius:10,padding:12,marginBottom:20,fontSize:13,color:"#a0aec0",fontStyle:"italic"}}>
          {bot.emoji} "{pickRandom(bot.dialogues.fail)}"
        </div>
        <button onClick={onFailed} style={{width:"100%",padding:"14px 0",background:"linear-gradient(135deg,#ff6b35,#ff4444)",border:"none",borderRadius:10,color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer"}}>
          ⚖️ Avukat Tut →
        </button>
      </div>
    );
  }

  return (
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:52,marginBottom:16,animation:"float 1.5s ease-in-out infinite"}}>{stage.emoji}</div>
      <h3 style={{color:"#e2e8f0",fontSize:20,marginBottom:4}}>Teslimat Süreci</h3>
      <p style={{color:"#718096",fontSize:13,marginBottom:20}}>{bot.emoji} {bot.name} gönderiyor…</p>
      {/* Progress bar */}
      <div style={{height:6,background:"rgba(255,255,255,.08)",borderRadius:3,overflow:"hidden",marginBottom:12}}>
        <div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#00d4aa,#0099ff)",borderRadius:3,transition:"width .05s linear"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#4a5568",marginBottom:20}}>
        <span>{stage.text}</span>
        <span style={{fontFamily:"'Space Mono',monospace",color:"#00d4aa"}}>{progress}%</span>
      </div>
      {deliveryTimeMult>1&&(
        <div style={{background:"rgba(255,107,53,.08)",border:"1px solid rgba(255,107,53,.2)",borderRadius:8,padding:"6px 12px",fontSize:11,color:"#f6ad55"}}>
          ⚠️ Tedarik zinciri krizi: süre ×{deliveryTimeMult}
        </div>
      )}
    </div>
  );
}

// ─── BOT CARD ─────────────────────────────────────────────────────────────────
const BotCard = memo(function BotCard({bot, trustScore, selected, onSelect, disabled, simYear=LAWSUIT_START_YEAR}) {
  const badge = getReputationBadge(trustScore);
  const discount = Math.floor((trustScore/MAX_TRUST_SCORE)*TRUST_DISCOUNT_MAX);
  const inflYears   = Math.max(0, simYear - LAWSUIT_START_YEAR);
  const dispPrice   = inflYears > 0 ? priceAtSimYear(bot.basePrice,  simYear, 0.09) : bot.basePrice;
  const dispReward  = inflYears > 0 ? priceAtSimYear(bot.baseReward, simYear, 0.09) : bot.baseReward;
  return (
    <div onClick={()=>!disabled&&onSelect(bot)} style={{
      border:`2px solid ${selected?"rgba("+bot.colorRgb+",.8)":"rgba("+bot.colorRgb+",.2)"}`,
      borderRadius:16,padding:24,cursor:disabled?"not-allowed":"pointer",
      background:selected?`rgba(${bot.colorRgb},.08)`:"rgba(255,255,255,.02)",
      transition:"all .2s",opacity:disabled?.5:1,transform:selected?"scale(1.02)":"scale(1)",
      position:"relative",overflow:"hidden",
    }}>
      {selected&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,rgba(${bot.colorRgb},1),transparent)`}}/>}
      <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:12}}>
        <span style={{fontSize:32,animation:"float 3s ease-in-out infinite"}}>{bot.emoji}</span>
        <div style={{flex:1}}>
          <div style={{color:"#e2e8f0",fontWeight:700,fontSize:16}}>{bot.name}</div>
          <div style={{color:"#718096",fontSize:11,marginTop:2}}>{bot.title}</div>
          <div style={{marginTop:5,display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:6,padding:"2px 8px"}}>
            <span style={{color:"#a0aec0",fontSize:10}}>{bot.contractType}</span>
            <span style={{color:"#4a5568",fontSize:10}}>·</span>
            <span style={{color:`rgba(${bot.colorRgb},.7)`,fontSize:10,fontFamily:"'Space Mono',monospace"}}>{bot.contractRef}</span>
          </div>
          <div style={{marginTop:6,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{background:`rgba(${bot.colorRgb},.15)`,color:bot.riskColor,fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600}}>{bot.risk}</span>
            <span style={{background:"rgba(255,255,255,.05)",color:badge.color,fontSize:10,padding:"2px 8px",borderRadius:20}}>Güven {trustScore}/100</span>
            {discount>0&&<span style={{background:"rgba(0,212,170,.1)",color:"#00d4aa",fontSize:10,padding:"2px 8px",borderRadius:20}}>-{discount}% indirim</span>}
          </div>
        </div>
      </div>
      <p style={{color:"#718096",fontSize:12,lineHeight:1.6,marginBottom:12}}>{bot.description}</p>
      <div style={{fontFamily:"'Space Mono',monospace",color:`rgba(${bot.colorRgb},.7)`,fontSize:11,fontStyle:"italic"}}>"{bot.catchphrase}"</div>
      <div style={{display:"flex",gap:16,marginTop:12,paddingTop:12,borderTop:"1px solid rgba(255,255,255,.06)"}}>
        <div style={{textAlign:"center"}}>
          <div style={{color:"#e2e8f0",fontWeight:700,fontFamily:"'Space Mono',monospace"}}>{dispPrice} JC</div>
          <div style={{color:"#4a5568",fontSize:10}}>Ödeme</div>
          {inflYears>0&&<div style={{color:"#f6ad55",fontSize:9,marginTop:2}}>📈 {simYear} fiyatı</div>}
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{color:"#00d4aa",fontWeight:700,fontFamily:"'Space Mono',monospace"}}>{dispReward} JC</div>
          <div style={{color:"#4a5568",fontSize:10}}>Beklenen</div>
        </div>
        <div style={{textAlign:"center"}}><div style={{color:bot.baseSuccessRate>0.6?"#00d4aa":bot.baseSuccessRate>0.4?"#f39c12":"#ff4444",fontWeight:700,fontFamily:"'Space Mono',monospace"}}>%{Math.round(bot.baseSuccessRate*100)}</div><div style={{color:"#4a5568",fontSize:10}}>Başarı</div></div>
      </div>
    </div>
  );
});

// ─── LAWYER SELECT ────────────────────────────────────────────────────────────
function LawyerSelect({bot, onSelect, simYear=LAWSUIT_START_YEAR}) {
  const [chosen, setChosen] = useState(null);
  const [mode, setMode] = useState("lawsuit");
  const isArb = mode==="arbitration";
  const yearsRange = isArb ? ARBITRATION_YEARS_BY_BOT[bot.id] : LAWSUIT_YEARS_BY_BOT[bot.id];
  const yearsDisplay = `${yearsRange.min}–${yearsRange.max}`;
  const baseFee    = isArb ? computeArbitrationFee(bot.basePrice) : computeCourtFee(bot.basePrice);
  const inflFee    = priceAtSimYear(baseFee, simYear, COURT_INFLATION_RATE);
  const inflYears  = Math.max(0, simYear - LAWSUIT_START_YEAR);
  const lawyerInflFee = l => priceAtSimYear(l.fee, simYear, LAWYER_INFLATION_RATE);

  return (
    <div style={{animation:"lawyerPop .4s ease-out"}}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:40,marginBottom:8}}>⚖️</div>
        <h3 style={{color:"#e2e8f0",fontSize:20,marginBottom:4}}>Hukuki Temsil Seçin</h3>
        <p style={{color:"#718096",fontSize:13}}>
          Harç: <strong style={{color:"#ff4444"}}>{inflFee} JC</strong>
          {inflYears>0&&<span style={{color:"#f6ad55",fontSize:11}}> (📈 {simYear})</span>}
          {" · "}Süreç: <strong style={{color:"#f39c12"}}>{yearsDisplay} yıl</strong> (rastgele)
        </p>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:20,background:"rgba(255,255,255,.03)",borderRadius:12,padding:6}}>
        {["lawsuit","arbitration"].map(m=>(
          <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"10px 0",border:"none",borderRadius:8,cursor:"pointer",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,background:mode===m?"rgba(0,212,170,.15)":"transparent",color:mode===m?"#00d4aa":"#718096",transition:"all .2s"}}>
            {m==="lawsuit"?"Mahkeme Davası":"Tahkim / Arabulucu"}
          </button>
        ))}
      </div>
      <div style={{display:"grid",gap:12,marginBottom:20}}>
        {LAWYERS.map(l=>(
          <div key={l.id} onClick={()=>setChosen(l)} style={{border:`2px solid ${chosen?.id===l.id?"rgba(0,212,170,.6)":"rgba(255,255,255,.06)"}`,borderRadius:12,padding:16,cursor:"pointer",background:chosen?.id===l.id?"rgba(0,212,170,.05)":"rgba(255,255,255,.02)",display:"flex",alignItems:"center",gap:16,transition:"all .2s"}}>
            <span style={{fontSize:28}}>{l.emoji}</span>
            <div style={{flex:1}}>
              <div style={{color:"#e2e8f0",fontWeight:700}}>{l.name}</div>
              <div style={{color:"#718096",fontSize:11}}>{l.title}</div>
              <div style={{color:"#a0aec0",fontSize:12,marginTop:4,fontStyle:"italic"}}>"{pickRandom(l.dialogues)}"</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{color:"#ff6b35",fontFamily:"'Space Mono',monospace",fontWeight:700}}>{lawyerInflFee(l)} JC</div>
              <div style={{color:"#4a5568",fontSize:10}}>Avukat ücreti{inflYears>0?` (📈${simYear})`:""}</div>
              <div style={{color:"#00d4aa",fontSize:11,marginTop:4}}>Kazanma: %{Math.round(l.winMultiplier*100)}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:"rgba(255,68,68,.06)",border:"1px solid rgba(255,68,68,.2)",borderRadius:10,padding:14,marginBottom:20,fontSize:13,color:"#fc8181"}}>
        ⏳ <LegalTermTooltip termKey="temerrut">Temerrüt</LegalTermTooltip> tarihinden itibaren her yıl değer kaybı.
        {yearsDisplay} yıl sonra paranın değeri: <strong>%{Math.round((INFLATION_BY_YEAR[yearsRange.min]||0.5)*100)}–%{Math.round((INFLATION_BY_YEAR[yearsRange.max]||0.2)*100)}</strong>
      </div>
      <button disabled={!chosen} onClick={()=>onSelect(chosen,mode)} style={{width:"100%",padding:"14px 0",border:"none",borderRadius:10,cursor:chosen?"pointer":"not-allowed",background:chosen?"linear-gradient(135deg,#ff6b35,#ff4444)":"rgba(255,255,255,.1)",color:chosen?"#fff":"#4a5568",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,transition:"all .2s"}}>
        {chosen?`${chosen.name} ile Davayı Başlat — ${inflFee+lawyerInflFee(chosen)} JC`:"Avukat Seçin"}
      </button>
    </div>
  );
}

// ─── TIME TUNNEL (v2.7: 2× slower + Hakim Bey judge) ─────────────────────────
// Legal complexity events that can fire during lawsuit (v3b)
const COMPLEXITY_EVENTS = {
  rookie_miss:   { prob:0.18, label:"⚠️ Avukat dosya süresini kaçırdı — dava 1 yıl uzadı!", addYears:1, color:"#ff4444" },
  opp_delay:     { prob:0.12, label:"📋 Karşı taraf ek süre talep etti. Mahkeme kabul etti.",  addYears:0, color:"#f39c12" },
  witness_added: { prob:0.08, label:"🧑‍⚖️ Yeni tanık listesi sunuldu. Süreç uzuyor.",            addYears:0, color:"#f39c12" },
  doc_missing:   { prob:0.10, label:"📁 Kritik belge eksik — noter tasdiki istendi.",            addYears:0, color:"#f39c12" },
};

const LAWYER_INFLATION_RATE    = 0.09; // Türkiye Barolar Birliği asgari ücret artışı
const COURT_INFLATION_RATE     = 0.09; // yıllık mahkeme harcı artışı
const BOT_PRICE_INFLATION_RATE = 0.15; // Türk enflasyonu — mal/hizmet fiyat artışı
const LAWSUIT_START_YEAR  = 2021;
const LAWSUIT_START_MONTH = 10; // Kasım (0-indexed)
const MS_PER_TUNNEL_YEAR  = 5000; // ms per lawsuit year in TimeTunnel
const TR_MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

function TimeTunnel({bot, lawyer, mode, isArb, onComplete}) {
  // v3a: randomize lawsuit duration within bot's min/max range
  const yearsRange = isArb ? ARBITRATION_YEARS_BY_BOT[bot.id] : LAWSUIT_YEARS_BY_BOT[bot.id];
  // v3b: use state so complexity events can extend the lawsuit
  const [maxYears, setMaxYears] = useState(()=> yearsRange.min + Math.floor(Math.random()*(yearsRange.max-yearsRange.min+1)));
  const maxYearsRef = useRef(maxYears); // sync ref for use inside setTimeout
  useEffect(()=>{ maxYearsRef.current = maxYears; },[maxYears]);

  // inflation helpers — y: number of elapsed inflation cycles (0 = no inflation yet)
  const initialLawyerFee = lawyer.fee;
  const initialCourtFee  = isArb ? computeArbitrationFee(bot.basePrice) : computeCourtFee(bot.basePrice);
  const lawyerFeeAt  = y => Math.round(initialLawyerFee * Math.pow(1 + LAWYER_INFLATION_RATE,    y));
  const courtFeeAt   = y => Math.round(initialCourtFee  * Math.pow(1 + COURT_INFLATION_RATE,     y));
  const botPriceAt   = y => Math.round(bot.basePrice    * Math.pow(1 + BOT_PRICE_INFLATION_RATE, y));

  const baseYearEvents = useMemo(()=>buildYearEvents(maxYears, isArb),[]);
  const [currentYear, setCurrentYear] = useState(0);
  const [log, setLog] = useState([]);
  const [done, setDone] = useState(false);
  const [finalWon, setFinalWon] = useState(false);
  const [konkordato, setKonkordato] = useState(false);
  const [totalInflationCost, setTotalInflationCost] = useState(0);
  const inflCostRef = useRef(0); // mutable ref for closure inside setTimeout

  // real-calendar clock — 12 months per lawsuit year (MS_PER_TUNNEL_YEAR ms)
  const [msElapsed, setMsElapsed] = useState(0);
  const msElapsedRef = useRef(0);
  const MS_PER_MONTH = MS_PER_TUNNEL_YEAR / 12;
  const totalMonthsElapsed  = Math.floor(msElapsed / MS_PER_MONTH);
  const calYear      = LAWSUIT_START_YEAR  + Math.floor((LAWSUIT_START_MONTH + totalMonthsElapsed) / 12);
  const calMonthIdx  = (LAWSUIT_START_MONTH + totalMonthsElapsed) % 12;
  const yearsElapsed = Math.floor(totalMonthsElapsed / 12);
  const monthsInYear = totalMonthsElapsed % 12;

  const logEndRef = useRef(null);

  // calendar tick — stops when done
  useEffect(()=>{
    if (done) return;
    const iv = setInterval(()=>{
      msElapsedRef.current += 100;
      setMsElapsed(msElapsedRef.current);
    }, 100);
    return ()=>clearInterval(iv);
  }, [done]);

  useEffect(()=>{ logEndRef.current?.scrollIntoView({behavior:"smooth"}); },[log]);

  useEffect(()=>{
    if (currentYear >= maxYearsRef.current) {
      const lastIdx = Math.min(currentYear-1, baseYearEvents.length-1);
      const lastWinProb = baseYearEvents[lastIdx]?.winProb||0.5;
      const adjustedWinProb = Math.min(lastWinProb*lawyer.winMultiplier,0.95);
      const won = Math.random()<adjustedWinProb;
      const konk = !won && Math.random()<KONKORDATO_CHANCE;
      setFinalWon(won);
      setKonkordato(konk);
      setDone(true);
      return;
    }
    // v2.7: 5000ms per year; v3b: complexity events
    const timer = setTimeout(()=>{
      const evIdx = Math.min(currentYear, baseYearEvents.length-1);
      const ev = baseYearEvents[evIdx] || {year:currentYear+1, events:YEAR_EVENT_POOL[3].events, winProb:YEAR_EVENT_POOL[3].winProb};
      const courtText = pickRandom(ev.events);
      const judgeText = getJudgeDialogue(ev.year||currentYear+1, ev.winProb);

      // v3b: roll complexity event
      let complexityEvent = null;
      const cRoll = Math.random();
      if (lawyer.id==="rookie" && cRoll < COMPLEXITY_EVENTS.rookie_miss.prob) {
        complexityEvent = COMPLEXITY_EVENTS.rookie_miss;
        setMaxYears(m=>{ maxYearsRef.current = m+1; return m+1; });
      } else if (cRoll < COMPLEXITY_EVENTS.opp_delay.prob) {
        complexityEvent = COMPLEXITY_EVENTS.opp_delay;
      } else if (cRoll < COMPLEXITY_EVENTS.opp_delay.prob + COMPLEXITY_EVENTS.witness_added.prob) {
        complexityEvent = COMPLEXITY_EVENTS.witness_added;
      } else if (cRoll < COMPLEXITY_EVENTS.opp_delay.prob + COMPLEXITY_EVENTS.witness_added.prob + COMPLEXITY_EVENTS.doc_missing.prob) {
        complexityEvent = COMPLEXITY_EVENTS.doc_missing;
      }

      // inflation event — fees increase every year after the first
      let inflationEvent = null;
      if (currentYear >= 1) {
        const oldLawyer   = lawyerFeeAt(currentYear - 1);
        const newLawyer   = lawyerFeeAt(currentYear);
        const oldCourt    = courtFeeAt(currentYear - 1);
        const newCourt    = courtFeeAt(currentYear);
        const oldBotPrice = botPriceAt(currentYear - 1);
        const newBotPrice = botPriceAt(currentYear);
        const delta = (newLawyer - oldLawyer) + (newCourt - oldCourt);
        inflCostRef.current += delta;
        setTotalInflationCost(inflCostRef.current);
        const inflCalYear = LAWSUIT_START_YEAR + currentYear;
        inflationEvent = { year: currentYear+1, calYear: inflCalYear, oldLawyer, newLawyer, oldCourt, newCourt, oldBotPrice, newBotPrice, delta };
      }

      setLog(l=>[...l, {year:currentYear+1, courtText, judgeText, winProb:ev.winProb, complexityEvent, inflationEvent}]);
      setCurrentYear(y=>y+1);
    }, 5000);
    return ()=>clearTimeout(timer);
  },[currentYear]);

  if (done) {
    return (
      <div style={{textAlign:"center",animation:"countUp .5s ease-out"}}>
        <div style={{fontSize:60,marginBottom:12}}>{finalWon?"🏆":konkordato?"💀":"😔"}</div>
        <h3 style={{color:finalWon?"#00d4aa":konkordato?"#ff4444":"#f39c12",fontSize:22,marginBottom:8}}>
          {finalWon?"Dava Kazanıldı":konkordato?"Konkordato İlan Edildi":"Dava Kaybedildi"}
        </h3>
        {konkordato&&<p style={{color:"#fc8181",fontSize:13,marginBottom:12}}><LegalTermTooltip termKey="konkordato">Konkordato</LegalTermTooltip>: karşı taraf mahkeme korumasına girdi.</p>}
        <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)",borderRadius:10,padding:"10px 14px",marginBottom:16,display:"inline-flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:20}}>{JUDGE_EMOJI}</span>
          <span style={{color:"#a0aec0",fontSize:13,fontStyle:"italic"}}>
            "{finalWon?"Deliller yeterli bulundu. Karar müvekkil lehine.":"Yetersiz ispat. Karar karşı taraf lehine."}"
          </span>
        </div>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(0,153,255,.08)",border:"1px solid rgba(0,153,255,.2)",borderRadius:10,padding:"7px 16px",marginBottom:12,fontSize:13,color:"#63b3ed"}}>
          📅 {TR_MONTHS[calMonthIdx]} {calYear} · Geçen Süre: {yearsElapsed} yıl {monthsInYear} ay
        </div>
        <p style={{color:"#718096",fontSize:13,marginBottom:8}}>
          {maxYears} yıl sonra paranın değeri: <strong style={{color:"#f39c12"}}>%{Math.round((INFLATION_BY_YEAR[Math.min(maxYears,10)]||0.2)*100)}</strong>
        </p>
        {totalInflationCost>0&&(
          <div style={{background:"rgba(255,107,53,.08)",border:"1px solid rgba(255,107,53,.25)",borderRadius:10,padding:"8px 16px",marginBottom:16,fontSize:13,color:"#f6ad55",display:"inline-block"}}>
            📈 Süreçte artan ücretler (enflasyon): <strong style={{color:"#ff6b35"}}>+{totalInflationCost} JC</strong>
          </div>
        )}
        <div style={{marginBottom:16}}/>
        <button onClick={()=>onComplete({won:finalWon,konkordato,totalYears:maxYears,isArb,totalInflationCost:inflCostRef.current})} style={{padding:"12px 32px",background:finalWon?"linear-gradient(135deg,#00d4aa,#0099ff)":"rgba(255,255,255,.1)",border:"none",borderRadius:10,color:finalWon?"#060a10":"#e2e8f0",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer"}}>
          Sonucu Gör →
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{textAlign:"center",marginBottom:20}}>
        <div style={{color:"#718096",fontSize:11,marginBottom:6,fontFamily:"'Space Mono',monospace",letterSpacing:2}}>
          ZAMAN TÜNELİ — {isArb?"TAHKİM":"MAHKEME"} SÜRECİ
        </div>

        {/* Calendar date & elapsed time */}
        <div style={{display:"flex",justifyContent:"center",gap:16,marginBottom:10,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(0,153,255,.1)",border:"1px solid rgba(0,153,255,.25)",borderRadius:8,padding:"5px 12px"}}>
            <span style={{fontSize:14}}>📅</span>
            <span style={{color:"#63b3ed",fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700}}>
              {TR_MONTHS[calMonthIdx]} {calYear}
            </span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:8,padding:"5px 12px"}}>
            <span style={{fontSize:12}}>⏱️</span>
            <span style={{color:"#a0aec0",fontSize:12}}>
              Geçen Süre: <strong style={{color:"#e2e8f0"}}>{yearsElapsed > 0 ? `${yearsElapsed} yıl ` : ""}{monthsInYear} ay</strong>
            </span>
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:10}}>
          <span style={{fontSize:24}}>{JUDGE_EMOJI}</span>
          <div>
            <div style={{color:"#e2e8f0",fontSize:18,fontWeight:700}}>{currentYear}/{maxYears}. Yıl</div>
            <div style={{color:"#718096",fontSize:11}}>{JUDGE_NAME}</div>
          </div>
        </div>
        <div style={{height:4,background:"rgba(255,255,255,.08)",borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(currentYear/Math.max(maxYears,1))*100}%`,background:"linear-gradient(90deg,#ff6b35,#ff4444)",transition:"width 1.6s ease",borderRadius:2}}/>
        </div>
      </div>

      {/* Court log */}
      <div style={{maxHeight:340,overflowY:"auto",display:"flex",flexDirection:"column",gap:10}}>
        {log.map((entry,i)=>(
          <div key={i} style={{borderRadius:12,overflow:"hidden",animation:"slideIn .4s ease-out"}}>
            {/* Court event row */}
            <div style={{background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:`12px 12px ${entry.complexityEvent?"0":"0"} 0`,padding:"10px 14px",display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{color:"#f39c12",fontFamily:"'Space Mono',monospace",fontSize:11,whiteSpace:"nowrap",flexShrink:0,paddingTop:1}}>{entry.year}. YIL</span>
              <span style={{color:"#a0aec0",fontSize:13}}>{entry.courtText}</span>
            </div>
            {/* v3b: legal complexity event row */}
            {entry.complexityEvent && (
              <div style={{background:"rgba(255,68,68,.06)",borderLeft:`3px solid ${entry.complexityEvent.color}`,borderRight:"1px solid rgba(255,255,255,.06)",borderBottom:"1px solid rgba(255,255,255,.06)",padding:"7px 14px",display:"flex",gap:8,alignItems:"center",animation:"judgeIn .3s ease-out"}}>
                <span style={{color:entry.complexityEvent.color,fontSize:12,fontWeight:700}}>{entry.complexityEvent.label}</span>
                {entry.complexityEvent.addYears>0 && <span style={{fontSize:10,background:"rgba(255,68,68,.15)",color:"#fc8181",borderRadius:4,padding:"1px 6px"}}>+{entry.complexityEvent.addYears} yıl</span>}
              </div>
            )}
            {/* Inflation event row */}
            {entry.inflationEvent && (
              <div style={{background:"rgba(255,107,53,.06)",borderLeft:"3px solid #ff6b35",borderRight:"1px solid rgba(255,255,255,.06)",borderBottom:"1px solid rgba(255,255,255,.06)",padding:"8px 14px",animation:"judgeIn .3s ease-out"}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                  <span style={{color:"#ff6b35",fontSize:12,fontWeight:700}}>
                    📈 {entry.inflationEvent.calYear}: Avukat ücreti {entry.inflationEvent.oldLawyer}→{entry.inflationEvent.newLawyer} JC
                  </span>
                  <span style={{fontSize:10,background:"rgba(255,107,53,.15)",color:"#f6ad55",borderRadius:4,padding:"1px 6px",flexShrink:0,whiteSpace:"nowrap"}}>+{entry.inflationEvent.delta} JC</span>
                </div>
                <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                  <span style={{color:"#718096",fontSize:11}}>
                    Harç: {entry.inflationEvent.oldCourt}→<strong style={{color:"#f6ad55"}}>{entry.inflationEvent.newCourt} JC</strong>
                  </span>
                  <span style={{color:"#718096",fontSize:11}}>
                    Sözleşme değeri: {entry.inflationEvent.oldBotPrice}→<strong style={{color:"#fc8181"}}>{entry.inflationEvent.newBotPrice} JC</strong> (+%{Math.round(BOT_PRICE_INFLATION_RATE*100)})
                  </span>
                </div>
              </div>
            )}
            {/* Judge speech bubble */}
            <div style={{background:"rgba(255,255,255,.015)",borderLeft:"3px solid rgba(243,156,18,.4)",borderRight:"1px solid rgba(255,255,255,.06)",borderBottom:"1px solid rgba(255,255,255,.06)",padding:"8px 14px",display:"flex",gap:10,alignItems:"flex-start",animation:"judgeIn .3s ease-out"}}>
              <span style={{fontSize:16,flexShrink:0}}>{JUDGE_EMOJI}</span>
              <div>
                <span style={{color:"#f39c12",fontSize:10,fontWeight:700,letterSpacing:1}}>{JUDGE_NAME}: </span>
                <span style={{color:"#718096",fontSize:12,fontStyle:"italic"}}>"{entry.judgeText}"</span>
              </div>
            </div>
          </div>
        ))}

        {currentYear<maxYears&&(
          <div style={{textAlign:"center",padding:"20px 16px",color:"#4a5568",fontSize:12}}>
            <div style={{display:"inline-block",width:16,height:16,border:"2px solid rgba(243,156,18,.5)",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1.2s linear infinite",marginBottom:8}}/>
            <div>{JUDGE_EMOJI} Duruşma devam ediyor…</div>
          </div>
        )}
        <div ref={logEndRef}/>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PART 3 — AUTOPSY, RECEIPT, CONTRACT MODAL
   ═══════════════════════════════════════════════════════════════════════════ */

function EconomicAutopsy({autopsy, bot, method, onDone, sessionDurationMs}) {
  const [viewed, setViewed] = useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setViewed(true),2000); return ()=>clearTimeout(t); },[]);
  const humanCost = computeOpportunityCostHuman(autopsy.opportunityCost);
  const scAdvantageRealized = method!=="smart"&&autopsy.scSaving>0;
  useEffect(()=>{
    if(viewed) {
      track("COMPARISON_VIEW",{viewedAfterOutcome:true,timeSpentOnAutopsyMs:sessionDurationMs,scAdvantageRealized});
      logSimulation({type:"autopsy_viewed",method,won:autopsy?.won,totalClassicLoss:autopsy?.totalClassicLoss,scSaving:autopsy?.scSaving,scAdvantageRealized,sessionDurationMs});
    }
  },[viewed]);

  const Row=({label,value,color="#e2e8f0",note})=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
      <span style={{color:"#718096",fontSize:13}}>{label}</span>
      <div style={{textAlign:"right"}}>
        <span style={{color,fontFamily:"'Space Mono',monospace",fontWeight:700}}>{value}</span>
        {note&&<div style={{color:"#4a5568",fontSize:10}}>{note}</div>}
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
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        <div style={{background:method==="smart"?"rgba(0,212,170,.08)":"rgba(255,255,255,.03)",border:`1px solid ${method==="smart"?"rgba(0,212,170,.4)":"rgba(255,255,255,.08)"}`,borderRadius:12,padding:16}}>
          <div style={{color:"#00d4aa",fontWeight:700,marginBottom:12,fontSize:13}}>⚡ Smart Contract</div>
          <Row label="Mahkeme harcı" value="0 JC" color="#00d4aa" note="Yok"/>
          <Row label="Enflasyon kaybı" value="0 JC" color="#00d4aa" note="Anında"/>
          <Row label="Fırsat maliyeti" value="0 JC" color="#00d4aa" note="0 yıl"/>
          <Row label="Konkordato riski" value="%0" color="#00d4aa"/>
        </div>
        <div style={{background:method!=="smart"?"rgba(255,68,68,.08)":"rgba(255,255,255,.03)",border:`1px solid ${method!=="smart"?"rgba(255,68,68,.3)":"rgba(255,255,255,.08)"}`,borderRadius:12,padding:16}}>
          <div style={{color:"#ff6b35",fontWeight:700,marginBottom:12,fontSize:13}}>⚖️ Klasik Yöntem</div>
          <Row label="Mahkeme harcı" value={`${autopsy.courtFee} JC`} color="#ff6b35"/>
          {/* v3a: inflation loss only when won, opportunity cost only when lost */}
          {autopsy.showInflLoss
            ? <Row label="Enflasyon kaybı" value={`${autopsy.inflationLoss} JC`} color="#ff4444" note="Kazandınız — ama geç tahsilat"/>
            : <Row label="Enflasyon kaybı" value="— JC" color="#4a5568" note="Tahsilat yok"/>
          }
          {autopsy.showOppCost
            ? <Row label="Fırsat maliyeti" value={`${autopsy.opportunityCost} JC`} color="#ff4444" note={`%${autopsy.annualRatePct} yıllık getiri kaçırıldı`}/>
            : <Row label="Fırsat maliyeti" value="— JC" color="#4a5568" note="Kaybedilmedi"/>
          }
          <Row label="Konkordato riski" value={`%${autopsy.konkordatoRisk}`} color="#f39c12"/>
        </div>
      </div>
      {autopsy.showOppCost && autopsy.opportunityCost>0 && (
        <div style={{background:"rgba(255,107,53,.08)",border:"1px solid rgba(255,107,53,.2)",borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{color:"#ff6b35",fontWeight:700,marginBottom:8,fontSize:13}}>⏱️ Fırsat Maliyeti Gerçekte Ne Demek?</div>
          <p style={{color:"#a0aec0",fontSize:13,lineHeight:1.7}}>
            Bu sürede Türkiye piyasasına (%{autopsy.annualRatePct} yıllık ortalama) yatırsaydınız{" "}
            <strong style={{color:"#ff6b35"}}>{autopsy.opportunityCost} JC</strong> kazanırdınız —{" "}
            yaklaşık <strong style={{color:"#ff6b35"}}>{humanCost.hours} çalışma saati</strong> ({humanCost.weeks} haftalık emek) değerinde.
          </p>
        </div>
      )}
      {autopsy.showInflLoss && autopsy.inflationLoss>0 && (
        <div style={{background:"rgba(255,68,68,.08)",border:"1px solid rgba(255,68,68,.2)",borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{color:"#ff4444",fontWeight:700,marginBottom:8,fontSize:13}}>📉 Enflasyon Kaybı Gerçekte Ne Demek?</div>
          <p style={{color:"#a0aec0",fontSize:13,lineHeight:1.7}}>
            Davayı kazansanız da tahsilat geç geldi. Paranızın satın alma gücü{" "}
            <strong style={{color:"#ff4444"}}>{autopsy.inflationLoss} JC</strong> eridi. Aynı para bugün daha az değer taşıyor.
          </p>
        </div>
      )}
      <div style={{background:scAdvantageRealized?"rgba(255,68,68,.06)":"rgba(0,212,170,.06)",border:`1px solid ${scAdvantageRealized?"rgba(255,68,68,.2)":"rgba(0,212,170,.2)"}`,borderRadius:12,padding:16,marginBottom:20}}>
        <p style={{color:scAdvantageRealized?"#fc8181":"#68d391",fontSize:13,lineHeight:1.7}}>{autopsy.summary}</p>
        {scAdvantageRealized&&<div style={{marginTop:8,color:"#ff6b35",fontWeight:700,fontSize:15}}>Toplam Kaçınılabilir Kayıp: <span style={{color:"#ff4444"}}>{autopsy.totalClassicLoss} JC</span></div>}
      </div>
      <button onClick={onDone} style={{width:"100%",padding:"14px 0",background:"linear-gradient(135deg,#00d4aa,#0099ff)",border:"none",borderRadius:10,color:"#060a10",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer"}}>
        Yeni Simülasyon →
      </button>
    </div>
  );
}

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

function ContractModal({bot, trustScore, onExecute, onBack, dominoBump, crashActive, eventEffect}) {
  const [params, setParams] = useState({timeout:15,penaltyRate:20,useOracle:false});
  const [effectivePenaltyRate, setEffectivePenaltyRate] = useState(20);
  const [evalResult, setEvalResult] = useState(null);
  const scTimeRef = useRef(Date.now());

  useEffect(()=>{ const d=Math.floor((trustScore/MAX_TRUST_SCORE)*TRUST_DISCOUNT_MAX); setEffectivePenaltyRate(Math.max(0,params.penaltyRate-d)); },[params.penaltyRate,trustScore]);
  useEffect(()=>{ const ev=botEvaluateContract(bot,{...params,penaltyRate:effectivePenaltyRate},trustScore); setEvalResult(ev); },[params,effectivePenaltyRate,trustScore]);

  const successRate = computeSuccessRate(bot,{...params,penaltyRate:effectivePenaltyRate},crashActive,dominoBump,eventEffect);
  const actualPrice = evalResult&&!evalResult.refused ? Math.round(bot.basePrice*evalResult.priceMultiplier) : bot.basePrice;
  const totalCost = actualPrice+(params.useOracle?ORACLE_FEE:0);

  function handleExecute() {
    track("SC_ARCHITECT",{botId:bot.id,timeout:params.timeout,penaltyRate:params.penaltyRate,useOracle:params.useOracle,trustDiscountApplied:evalResult?.discount||0,botResponse:evalResult?.refused?"refused":"accepted",reasoningTimeMs:Date.now()-scTimeRef.current});
    onExecute({params:{...params,effectivePenaltyRate},evalResult,totalCost,actualPrice});
  }

  const Slider=({label,field,min,max,valueLabel})=>(
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
        <span style={{color:"#a0aec0",fontSize:13}}>{label}</span>
        <span style={{color:"#00d4aa",fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700}}>{valueLabel||params[field]}</span>
      </div>
      <input type="range" min={min} max={max} value={params[field]} onChange={e=>setParams(p=>({...p,[field]:Number(e.target.value)}))} style={{accentColor:"#00d4aa"}}/>
    </div>
  );

  return (
    <div>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:40,marginBottom:8}}>⚡</div>
        <h3 style={{color:"#e2e8f0",fontSize:20,marginBottom:4}}>Smart Contract Mimarı</h3>
        <p style={{color:"#718096",fontSize:13}}>Sözleşme şartlarını ayarlayın</p>
        {crashActive&&<div style={{background:"rgba(255,68,68,.1)",border:"1px solid rgba(255,68,68,.3)",color:"#fc8181",borderRadius:8,padding:"8px 12px",marginTop:8,fontSize:12}}>⚠️ Piyasa krizi aktif</div>}
        {eventEffect?.rewardBonus&&<div style={{background:"rgba(0,212,170,.08)",border:"1px solid rgba(0,212,170,.2)",color:"#68d391",borderRadius:8,padding:"8px 12px",marginTop:8,fontSize:12}}>✦ Aktif olay: ödüller +%{Math.round(eventEffect.rewardBonus*100)}</div>}
      </div>
      <Slider label={<><LegalTermTooltip termKey="temerrut">Teslim Süresi</LegalTermTooltip></>} field="timeout" min={5} max={60} valueLabel={`${params.timeout} gün`}/>
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{color:"#a0aec0",fontSize:13}}><LegalTermTooltip termKey="cezaiSart">Cezai Şart</LegalTermTooltip></span>
          <div style={{textAlign:"right"}}>
            {evalResult?.discount>0&&<span style={{color:"#4a5568",fontSize:11,textDecoration:"line-through",marginRight:6}}>%{params.penaltyRate}</span>}
            <span style={{color:"#00d4aa",fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700}}>%{effectivePenaltyRate}</span>
            {evalResult?.discount>0&&<span style={{color:"#00d4aa",fontSize:10,marginLeft:4}}>(-{evalResult.discount})</span>}
          </div>
        </div>
        <input type="range" min={5} max={50} value={params.penaltyRate} onChange={e=>setParams(p=>({...p,penaltyRate:Number(e.target.value)}))} style={{width:"100%",accentColor:"#00d4aa"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.08)",borderRadius:10,padding:"14px 16px",marginBottom:20}}>
        <div>
          <div style={{color:"#a0aec0",fontSize:13}}><LegalTermTooltip termKey="oracle">Oracle Entegrasyonu</LegalTermTooltip></div>
          <div style={{color:"#4a5568",fontSize:11,marginTop:2}}>+{ORACLE_FEE} JC · Başarı oranını önemli artırır</div>
        </div>
        <label style={{position:"relative",display:"inline-block",width:44,height:24,cursor:"pointer"}}>
          <input type="checkbox" checked={params.useOracle} onChange={e=>setParams(p=>({...p,useOracle:e.target.checked}))} style={{opacity:0,width:0,height:0}}/>
          <span style={{position:"absolute",inset:0,background:params.useOracle?"#00d4aa":"rgba(255,255,255,.1)",borderRadius:12,transition:"background .2s"}}/>
          <span style={{position:"absolute",top:3,left:params.useOracle?23:3,width:18,height:18,background:"#fff",borderRadius:"50%",transition:"left .2s"}}/>
        </label>
      </div>
      {evalResult&&(
        <div style={{marginBottom:20,padding:14,borderRadius:10,background:evalResult.refused?"rgba(255,68,68,.08)":evalResult.priceMultiplier>1?"rgba(255,107,53,.08)":"rgba(0,212,170,.08)",border:`1px solid ${evalResult.refused?"rgba(255,68,68,.3)":evalResult.priceMultiplier>1?"rgba(255,107,53,.3)":"rgba(0,212,170,.2)"}`}}>
          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{fontSize:20}}>{bot.emoji}</span>
            <div>
              <div style={{color:"#e2e8f0",fontSize:13,fontWeight:600,marginBottom:4}}>{bot.name}:</div>
              <div style={{color:evalResult.refused?"#fc8181":evalResult.priceMultiplier>1?"#f6ad55":"#68d391",fontSize:13}}>{evalResult.reason||`"Şartları kabul ediyorum."`}</div>
            </div>
          </div>
          <div style={{marginTop:12,display:"flex",gap:16,fontSize:12}}>
            <div style={{color:"#718096"}}>Başarı: <strong style={{color:successRate>0.6?"#00d4aa":successRate>0.3?"#f39c12":"#ff4444"}}>%{Math.round(successRate*100)}</strong></div>
            <div style={{color:"#718096"}}>Maliyet: <strong style={{color:"#e2e8f0"}}>{totalCost} JC</strong></div>
            {dominoBump>0&&<div style={{color:"#ff6b35",fontSize:11}}>Domino: -{Math.round(dominoBump*100)}%</div>}
          </div>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <button onClick={onBack} style={{padding:"12px 0",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"#a0aec0",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:14,cursor:"pointer"}}>← Geri</button>
        <button onClick={handleExecute} disabled={evalResult?.refused} style={{padding:"12px 0",background:evalResult?.refused?"rgba(255,255,255,.05)":"linear-gradient(135deg,#00d4aa,#0099ff)",border:"none",borderRadius:10,color:evalResult?.refused?"#4a5568":"#060a10",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,cursor:evalResult?.refused?"not-allowed":"pointer"}}>
          {evalResult?.refused?"Bot Reddetti":"Sözleşmeyi Kilitle ⚡"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PART 4 — COMPARISON TOOL, SOCIAL PROOF, FULL SIMULATION, APP
   ═══════════════════════════════════════════════════════════════════════════ */

function ComparisonTool({onBack}) {
  const [form, setForm] = useState({contractValue:50000,counterpartyRisk:"orta",durationMonths:12,jurisdiction:"turkey"});
  const [result, setResult] = useState(null);
  function compute() {
    track("CTA_CLICK",{ctaType:"comparison_tool_compute"});
    const val = form.contractValue;
    const intlExtra = form.jurisdiction==="international" ? 1.8 : 1;

    // v3b: Realistic Turkish commercial court statistics (UYAP 2023 data)
    // Average first-instance duration by jurisdiction
    const avgYears = form.jurisdiction==="international" ? 4.8
      : {turkey:3.2}[form.jurisdiction] || 3.2;
    const years = Math.max(avgYears, 1);

    // Plaintiff win rate in Turkish commercial courts (first instance ~58%, effective after appeal ~52%)
    const winRate = {dusuk:0.72, orta:0.58, yuksek:0.38}[form.counterpartyRisk] || 0.58;
    const failChance = 1 - winRate;

    // Court harç: Turkish court fee schedule (proportional — harçlar kanunu)
    // Değer esası: ~%6.9 oranında nispi harç (2024 tarifesi)
    const classicCourtFee = Math.round(Math.max(val * 0.069, 500));

    // AAÜT 2024: Avukatlık Asgari Ücret Tarifesi (sliding scale)
    const aaütRate = val<=200000 ? 0.15 : val<=1000000 ? 0.10 : val<=5000000 ? 0.07 : 0.05;
    const classicLawyerFee = Math.round(val * aaütRate * intlExtra);

    // Inflation: realistic (TK_OPPORTUNITY_BASE rates, not flat)
    const inflMult = INFLATION_BY_YEAR[Math.min(Math.ceil(years),10)] || 0.28;
    const classicInflLoss = Math.floor(val * (1-inflMult));

    // Opportunity cost: TK realistic rates (from Part 3a)
    const annualRate = Math.max(TK_OPPORTUNITY_BASE - (years-1)*0.025, TK_OPPORTUNITY_FLOOR);
    const classicOppCost = Math.floor(val * (Math.pow(1+annualRate, years) - 1));

    // Konkordato risk: ~11% of commercial cases where debtor loses (İİK md.285)
    const classicKonkRisk = Math.round(failChance * 0.11 * 100);

    const classicTotalRisk = classicCourtFee + classicLawyerFee + classicInflLoss + classicOppCost;

    // Smart contract: oracle fee + residual risk only (5% of fail scenario)
    const scOracleFee = form.jurisdiction==="international" ? 60 : 30;
    const scSuccessBoost = 0.88; // SC raises compliance probability
    const scProtectionRate = 1 - (failChance * (1 - scSuccessBoost));
    const scTotalRisk = Math.round(val * failChance * 0.05) + scOracleFee;

    setResult({val, years, winRate, classicCourtFee, classicLawyerFee, classicInflLoss, classicOppCost, classicKonkRisk, classicTotalRisk, scOracleFee, scProtectionRate, scTotalRisk, savings:Math.max(classicTotalRisk-scTotalRisk,0), annualRatePct:Math.round(annualRate*100)});
  }
  const f=n=>n.toLocaleString("tr-TR");
  return (
    <div style={{maxWidth:720,margin:"0 auto"}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{color:"#9b59b6",fontFamily:"'Space Mono',monospace",fontSize:11,letterSpacing:2,marginBottom:8}}>KARŞILAŞTIRMA ARACI</div>
        <h2 style={{color:"#e2e8f0",fontSize:26,marginBottom:8}}>Risk Analizi Hesaplayıcı</h2>
        <p style={{color:"#718096",fontSize:14}}>Sözleşme parametrelerini girin, SC avantajını görün.</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
        <div><label style={{color:"#a0aec0",fontSize:13,display:"block",marginBottom:8}}>Sözleşme Bedeli (TL)</label><input type="number" value={form.contractValue} onChange={e=>setForm(f=>({...f,contractValue:Number(e.target.value)}))} style={{width:"100%",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontFamily:"'Space Mono',monospace",fontSize:14,outline:"none"}}/></div>
        <div><label style={{color:"#a0aec0",fontSize:13,display:"block",marginBottom:8}}>Süre (Ay)</label><input type="number" value={form.durationMonths} onChange={e=>setForm(f=>({...f,durationMonths:Number(e.target.value)}))} style={{width:"100%",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontFamily:"'Space Mono',monospace",fontSize:14,outline:"none"}}/></div>
        <div><label style={{color:"#a0aec0",fontSize:13,display:"block",marginBottom:8}}>Karşı Taraf Riski</label><select value={form.counterpartyRisk} onChange={e=>setForm(f=>({...f,counterpartyRisk:e.target.value}))} style={{width:"100%",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontFamily:"'Syne',sans-serif",fontSize:14,outline:"none"}}><option value="dusuk">Düşük</option><option value="orta">Orta</option><option value="yuksek">Yüksek</option></select></div>
        <div><label style={{color:"#a0aec0",fontSize:13,display:"block",marginBottom:8}}>Yetki Alanı</label><select value={form.jurisdiction} onChange={e=>setForm(f=>({...f,jurisdiction:e.target.value}))} style={{width:"100%",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:"10px 12px",color:"#e2e8f0",fontFamily:"'Syne',sans-serif",fontSize:14,outline:"none"}}><option value="turkey">Türkiye</option><option value="international">Uluslararası</option></select></div>
      </div>
      <button onClick={compute} style={{width:"100%",padding:"14px 0",background:"linear-gradient(135deg,#9b59b6,#8e44ad)",border:"none",borderRadius:10,color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer",marginBottom:24}}>Risk Analizi Hesapla →</button>
      {result&&(
        <div style={{animation:"countUp .4s ease-out"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
            <div style={{background:"rgba(255,68,68,.08)",border:"1px solid rgba(255,68,68,.3)",borderRadius:12,padding:20}}>
              <div style={{color:"#ff4444",fontWeight:700,marginBottom:4}}>⚖️ Klasik Yöntem Riski</div>
              <div style={{color:"#4a5568",fontSize:10,marginBottom:12}}>Ort. dava süresi: ~{result.years.toFixed(1)} yıl · Kazanma ihtimali: %{Math.round(result.winRate*100)}</div>
              <div style={{fontSize:13,color:"#718096",display:"flex",flexDirection:"column",gap:8}}>
                <div>Mahkeme harcı (AAÜT): <strong style={{color:"#e2e8f0"}}>{f(result.classicCourtFee)} TL</strong></div>
                <div>Avukat ücreti (AAÜT): <strong style={{color:"#e2e8f0"}}>{f(result.classicLawyerFee)} TL</strong></div>
                <div>Enflasyon kaybı: <strong style={{color:"#ff6b35"}}>{f(result.classicInflLoss)} TL</strong></div>
                <div>Fırsat maliyeti (%{result.annualRatePct}/yıl): <strong style={{color:"#ff6b35"}}>{f(result.classicOppCost)} TL</strong></div>
                <div>Konkordato riski (İİK 285): <strong style={{color:"#f39c12"}}>%{result.classicKonkRisk}</strong></div>
              </div>
              <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid rgba(255,68,68,.2)"}}><div style={{color:"#718096",fontSize:11}}>TOPLAM RİSK</div><div style={{color:"#ff4444",fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:20}}>{f(result.classicTotalRisk)} TL</div></div>
            </div>
            <div style={{background:"rgba(0,212,170,.08)",border:"1px solid rgba(0,212,170,.3)",borderRadius:12,padding:20}}>
              <div style={{color:"#00d4aa",fontWeight:700,marginBottom:16}}>⚡ Smart Contract Riski</div>
              <div style={{fontSize:13,color:"#718096",display:"flex",flexDirection:"column",gap:8}}>
                <div>Oracle ücreti: <strong style={{color:"#e2e8f0"}}>{f(result.scOracleFee)} TL</strong></div>
                <div>Mahkeme harcı: <strong style={{color:"#00d4aa"}}>0 TL</strong></div>
                <div>Bekleme süresi: <strong style={{color:"#00d4aa"}}>0 yıl</strong></div>
                <div>Koruma oranı: <strong style={{color:"#00d4aa"}}>%{Math.round(result.scProtectionRate*100)}</strong></div>
              </div>
              <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid rgba(0,212,170,.2)"}}><div style={{color:"#718096",fontSize:11}}>TOPLAM RİSK</div><div style={{color:"#00d4aa",fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:20}}>{f(result.scTotalRisk)} TL</div></div>
            </div>
          </div>
          <div style={{background:"rgba(0,212,170,.06)",border:"1px solid rgba(0,212,170,.2)",borderRadius:12,padding:20,textAlign:"center"}}>
            <div style={{color:"#00d4aa",fontWeight:700,fontSize:20,marginBottom:4}}>Smart Contract ile {f(result.savings)} TL tasarruf potansiyeli</div>
            <div style={{color:"#718096",fontSize:13}}>Bu analiz simülasyon amaçlıdır. Hukuki tavsiye niteliği taşımaz.</div>
          </div>
        </div>
      )}
      <button onClick={onBack} style={{marginTop:16,padding:"10px 24px",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,color:"#a0aec0",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:14,cursor:"pointer"}}>← Geri</button>
    </div>
  );
}

function SocialProofWidget() {
  const data = {todayCount:847+Math.floor(Date.now()/600000)%30,scPreferenceRate:73,avgSavings:2840,konkordatoAvoided:124};
  return (
    <div style={{background:"rgba(0,212,170,.04)",border:"1px solid rgba(0,212,170,.15)",borderRadius:12,padding:"12px 20px",display:"flex",gap:24,flexWrap:"wrap",justifyContent:"center"}}>
      {[{value:data.todayCount,label:"Bugün denedi"},{value:`%${data.scPreferenceRate}`,label:"SC tercih etti"},{value:`${data.avgSavings} JC`,label:"Ort. tasarruf"},{value:data.konkordatoAvoided,label:"Konkordato önlendi"}].map((d,i)=>(
        <div key={i} style={{textAlign:"center"}}>
          <div style={{color:"#00d4aa",fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:16}}>{d.value}</div>
          <div style={{color:"#4a5568",fontSize:11}}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── FULL SIMULATION ──────────────────────────────────────────────────────────
function FullSimulation({abVariant, coins, setCoins, trustScores, setTrustScores, stats, setStats, capitalProtected, setCapitalProtected, legalRisk, setLegalRisk, sessionStart, eventEffect, onRoundComplete, simYear=LAWSUIT_START_YEAR, onAdvanceSimDate}) {
  const [phase, setPhase] = useState("select_bot");
  const [selectedBot, setSelectedBot] = useState(null);
  const [chosenMethod, setChosenMethod] = useState(null);
  const [hasPlayedClassic, setHasPlayedClassic] = useState(false);
  const [crashActive, setCrashActive] = useState(false);
  const [dominoBump, setDominoBump] = useState(0);
  const [scExecData, setScExecData] = useState(null);
  const [contractId, setContractId] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [autopsy, setAutopsy] = useState(null);
  const [konkordato, setKonkordato] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState(null);
  const [legalMode, setLegalMode] = useState("lawsuit");

  // v2.7: win/loss animations
  const [showConfetti, setShowConfetti] = useState(false);
  const [showLossFlash, setShowLossFlash] = useState(false);
  // v3b: bilateral trade + SC progress
  const [pendingDeliverySuccess, setPendingDeliverySuccess] = useState(false);
  const [execProgress, setExecProgress] = useState(0);
  const execRafRef = useRef(null);

  const animQueueRef = useRef([]);
  const animRunningRef = useRef(false);
  const [coinAnim, setCoinAnim] = useState(null);

  function queueCoinAnim(amount) { animQueueRef.current.push(amount); drainAnimQueue(); }
  function drainAnimQueue() {
    if (animRunningRef.current||animQueueRef.current.length===0) return;
    animRunningRef.current=true;
    const amount=animQueueRef.current.shift();
    setCoinAnim({amount,id:Date.now()});
    setTimeout(()=>{ setCoinAnim(null); animRunningRef.current=false; drainAnimQueue(); },700);
  }

  function triggerWinAnim()  { setShowConfetti(true); }
  function triggerLossAnim() { setShowLossFlash(true); setTimeout(()=>setShowLossFlash(false),1200); }

  useEffect(()=>{
    if (!eventEffect) return;
    if (eventEffect.crashActive) setCrashActive(true);
    if (eventEffect.dominoBump) setDominoBump(d=>Math.min(d+eventEffect.dominoBump,0.8));
    if (eventEffect.dominoBumpReduce) setDominoBump(d=>Math.max(0,d-eventEffect.dominoBumpReduce));
  },[eventEffect]);

  // v3b: smooth SC execution progress bar via requestAnimationFrame
  useEffect(()=>{
    if (phase!=="sc_executing" || !selectedBot) { setExecProgress(0); return; }
    const duration = selectedBot.delay * 0.9;
    let startTs = null;
    const animate = (ts) => {
      if (!startTs) startTs = ts;
      const prog = Math.min(((ts-startTs)/duration)*92, 92);
      setExecProgress(Math.round(prog));
      if (prog < 92) execRafRef.current = requestAnimationFrame(animate);
    };
    execRafRef.current = requestAnimationFrame(animate);
    return ()=>{ if(execRafRef.current) cancelAnimationFrame(execRafRef.current); };
  },[phase]);

  const isMethodLocked = abVariant==="forceClassicFirst"&&!hasPlayedClassic;

  function handleBotSelect(bot) {
    track("BOT_SELECT",{botId:bot.id});
    logSimulation({type:"bot_selected", botId:bot.id, botName:bot.name, trustScore:trustScores[bot.id]||50, coins});
    if(typeof gtag==="function") gtag("event","bot_selected",{bot_id:bot.id});
    setSelectedBot(bot); setPhase("choose_method");
  }

  function handleMethodChoice(method) {
    if (isMethodLocked&&method==="smart") return;
    track("METHOD_CHOICE",{chosenMethod:method});
    logSimulation({type:"method_chosen", method, botId:selectedBot?.id, coins});
    if(typeof gtag==="function") gtag("event","method_chosen",{method});
    setChosenMethod(method);
    if (method==="smart") { setPhase("sc_architect"); return; }
    // v3b: roll delivery outcome upfront, then animate the shipping phase
    const deliverRate = computeClassicDirectRate(selectedBot,crashActive,eventEffect);
    const willDeliver = Math.random()<deliverRate;
    setPendingDeliverySuccess(willDeliver);
    setPhase("classic_shipping"); // always show shipping animation first
  }

  // v3b: shipping phase callbacks
  function handleShippingDelivered() {
    // Bot actually delivered — apply outcome then show confirmation card
    const {reward} = computeDynamicReward(selectedBot,crashActive,eventEffect);
    const profit = reward-selectedBot.basePrice;
    setCoins(c=>c+profit); queueCoinAnim(profit);
    setTrustScores(s=>applyTrustUpdate(s,selectedBot.id,"classic_success"));
    setDominoBump(d=>Math.max(0,d-DOMINO_RECOVERY));
    setCapitalProtected(c=>c+selectedBot.basePrice);
    setStats(s=>({...s,wins:s.wins+1,classicUses:s.classicUses+1}));
    setHasPlayedClassic(true);
    setAutopsy(computeAutopsy("classic",selectedBot,0,true));
    setOutcome({success:true,reward,profit,method:"classic",yearsSpent:0,refunded:0,directDelivery:true,dialogue:pickRandom(selectedBot.dialogues.success)});
    logSimulation({type:"round_complete",method:"classic_direct",won:true,botId:selectedBot.id,cost:selectedBot.basePrice,reward,profit,yearsSpent:0});
    triggerWinAnim();
    setPhase("classic_delivery_confirm");
  }
  function handleShippingFailed() { setPhase("classic_lawyer"); }
  function handleDeliveryConfirm() { setPhase("autopsy"); }

  function handleSCExecute({params,evalResult,totalCost,actualPrice}) {
    if (coins<totalCost) { alert("Yetersiz bakiye!"); return; }
    setCoins(c=>c-totalCost); queueCoinAnim(-totalCost);
    const cid=genContractId(); setContractId(cid);
    setScExecData({params,evalResult,totalCost,actualPrice});
    setPhase("sc_executing");
    const {reward} = computeDynamicReward(selectedBot,crashActive,eventEffect);
    const successRate = computeSuccessRate(selectedBot,{...params,penaltyRate:params.effectivePenaltyRate},crashActive,dominoBump,eventEffect);
    const success = Math.random()<successRate;
    setTimeout(()=>{
      if (success) {
        setCoins(c=>c+reward); queueCoinAnim(+reward);
        setTrustScores(s=>applyTrustUpdate(s,selectedBot.id,"sc_success"));
        setDominoBump(d=>Math.max(0,d-DOMINO_RECOVERY));
        setCapitalProtected(c=>c+actualPrice);
        setStats(s=>({...s,wins:s.wins+1,scUses:s.scUses+1}));
        setOutcome({success:true,reward,profit:reward-totalCost,method:"smart",yearsSpent:0,refunded:0,dialogue:pickRandom(selectedBot.dialogues.success)});
        triggerWinAnim();
        logSimulation({type:"round_complete",method:"smart",won:true,botId:selectedBot.id,cost:totalCost,reward,profit:reward-totalCost,yearsSpent:0,useOracle:params.useOracle});
        if(typeof gtag==="function") gtag("event","contract_outcome",{success:true,method:"smart"});
      } else {
        setCoins(c=>c+actualPrice); queueCoinAnim(+actualPrice);
        setTrustScores(s=>applyTrustUpdate(s,selectedBot.id,"sc_fail"));
        setDominoBump(d=>Math.min(d+DOMINO_FAILURE_BUMP,0.8));
        setStats(s=>({...s,losses:s.losses+1,scUses:s.scUses+1}));
        setOutcome({success:false,reward:0,profit:-(params.useOracle?ORACLE_FEE:0),method:"smart",yearsSpent:0,refunded:actualPrice,dialogue:pickRandom(selectedBot.dialogues.fail)});
        triggerLossAnim();
        logSimulation({type:"round_complete",method:"smart",won:false,botId:selectedBot.id,cost:totalCost,reward:0,profit:-(params.useOracle?ORACLE_FEE:0),yearsSpent:0,useOracle:params.useOracle});
        if(typeof gtag==="function") gtag("event","contract_outcome",{success:false,method:"smart"});
      }
      setAutopsy(computeAutopsy("smart",selectedBot,0,success));
      setPhase("sc_result");
    }, selectedBot.delay);
  }

  function handleLawyerSelect(lawyer, mode) {
    const fee=mode==="lawsuit"?computeCourtFee(selectedBot.basePrice):computeArbitrationFee(selectedBot.basePrice);
    const totalFee=fee+lawyer.fee;
    if (coins<totalFee) { alert("Yetersiz bakiye!"); return; }
    setCoins(c=>c-totalFee); queueCoinAnim(-totalFee);
    if(typeof gtag==="function") gtag("event","lawyer_selected",{lawyer_id:lawyer.id});
    setSelectedLawyer(lawyer); setLegalMode(mode); setHasPlayedClassic(true);
    setStats(s=>({...s,classicUses:s.classicUses+1}));
    setPhase("classic_tunnel");
  }

  function handleTunnelComplete({won,konkordato:konk,totalYears,isArb,totalInflationCost:inflCost=0}) {
    setKonkordato(konk);
    const courtFee=isArb?computeArbitrationFee(selectedBot.basePrice):computeCourtFee(selectedBot.basePrice);
    const lawyerFee=selectedLawyer?.fee||0;
    if (won) {
      const inflMult=INFLATION_BY_YEAR[totalYears]||0.2;
      const recovered=Math.floor(selectedBot.basePrice*inflMult*(selectedLawyer?.recoveryRate||0.5));
      setCoins(c=>c+recovered); queueCoinAnim(+recovered);
      setTrustScores(s=>applyTrustUpdate(s,selectedBot.id,isArb?"arbitration_win":"classic_success"));
      setLegalRisk(r=>Math.max(0,r-5));
      setStats(s=>({...s,wins:s.wins+1}));
      setOutcome({success:true,reward:recovered,profit:recovered-courtFee-lawyerFee,method:"classic",yearsSpent:totalYears,refunded:0,inflationCost:inflCost,dialogue:pickRandom(selectedBot.dialogues.success)});
      triggerWinAnim();
      logSimulation({type:"round_complete",method:isArb?"arbitration":"classic",won:true,botId:selectedBot.id,cost:courtFee+lawyerFee,reward:recovered,profit:recovered-courtFee-lawyerFee,yearsSpent:totalYears,isArb});
      if(typeof gtag==="function") gtag("event","contract_outcome",{success:true,method:isArb?"arbitration":"classic"});
    } else {
      setTrustScores(s=>applyTrustUpdate(s,selectedBot.id,"lawsuit"));
      setLegalRisk(r=>Math.min(100,r+15));
      setDominoBump(d=>Math.min(d+DOMINO_FAILURE_BUMP,0.8));
      setStats(s=>({...s,losses:s.losses+1}));
      setOutcome({success:false,reward:0,profit:-(courtFee+lawyerFee),method:"classic",yearsSpent:totalYears,refunded:0,inflationCost:inflCost,konkordato:konk,dialogue:pickRandom(selectedBot.dialogues.fail)});
      triggerLossAnim();
      logSimulation({type:"round_complete",method:isArb?"arbitration":"classic",won:false,botId:selectedBot.id,cost:courtFee+lawyerFee,reward:0,profit:-(courtFee+lawyerFee),yearsSpent:totalYears,isArb,konkordato:konk});
      if(typeof gtag==="function") gtag("event","contract_outcome",{success:false,method:isArb?"arbitration":"classic"});
    }
    setAutopsy(computeAutopsy("classic",selectedBot,totalYears,won));
    setPhase("classic_result");
  }

  function handleAutopsyDone() {
    const monthsToAdvance = outcome?.method==="smart" ? 2 : (outcome?.yearsSpent>0 ? outcome.yearsSpent*12 : 3);
    onAdvanceSimDate&&onAdvanceSimDate(monthsToAdvance);
    onRoundComplete&&onRoundComplete();
    resetGame();
  }

  function resetGame() {
    setPhase("select_bot"); setSelectedBot(null); setChosenMethod(null);
    setScExecData(null); setContractId(null); setOutcome(null); setAutopsy(null);
    setKonkordato(false); setSelectedLawyer(null); setLegalMode("lawsuit"); setCoinAnim(null);
    setShowConfetti(false); setShowLossFlash(false);
    setPendingDeliverySuccess(false); setExecProgress(0);
  }

  const cardStyle={background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.06)",borderRadius:20,padding:32,maxWidth:640,margin:"0 auto",position:"relative"};
  // v2.7: win/loss box-shadow animation on card
  const winCardStyle={...cardStyle,animation:"winFlash .8s ease-out"};
  const lossCardStyle={...cardStyle,animation:showLossFlash?"lossFlash .8s ease-out":"none"};

  if (phase==="select_bot") return (
    <div style={cardStyle}>
      {coinAnim&&<div key={coinAnim.id} style={{position:"fixed",top:80,right:32,color:coinAnim.amount>0?"#00d4aa":"#ff4444",fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:20,animation:"fadeUp .7s ease-out forwards",pointerEvents:"none",zIndex:500}}>{coinAnim.amount>0?"+":""}{coinAnim.amount} JC</div>}
      <div style={{textAlign:"center",marginBottom:28}}>
        <h2 style={{color:"#e2e8f0",fontSize:22,marginBottom:8}}>Karşı Tarafı Seçin</h2>
        <p style={{color:"#718096",fontSize:13}}>Kim ile anlaşma yapacaksınız?</p>
        {abVariant==="forceClassicFirst"&&<div style={{marginTop:10,background:"rgba(255,107,53,.08)",border:"1px solid rgba(255,107,53,.2)",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#f6ad55"}}>Önce klasik yöntemi deneyin.</div>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {BOTS.map(bot=><BotCard key={bot.id} bot={bot} trustScore={trustScores[bot.id]||50} selected={false} onSelect={handleBotSelect} disabled={false} simYear={simYear}/>)}
      </div>
    </div>
  );

  if (phase==="choose_method"&&selectedBot) {
    const isAiVariant=abVariant==="aiAdvisorProminent";
    const classicDeliverRate=computeClassicDirectRate(selectedBot,crashActive,eventEffect);
    return (
      <div style={cardStyle}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <span style={{fontSize:40}}>{selectedBot.emoji}</span>
          <h2 style={{color:"#e2e8f0",fontSize:20,marginTop:8,marginBottom:4}}>{selectedBot.name}</h2>
          <div style={{color:"#a0aec0",fontSize:12,marginBottom:4,fontFamily:"'Space Mono',monospace"}}>{selectedBot.contractType} · {selectedBot.contractRef}</div>
          <div style={{color:"#718096",fontSize:13,fontStyle:"italic"}}>"{pickRandom(selectedBot.dialogues.greet)}"</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <button onClick={()=>handleMethodChoice("classic")} style={{padding:"20px 16px",border:"2px solid rgba(255,107,53,.3)",borderRadius:14,cursor:"pointer",background:"rgba(255,107,53,.06)",color:"#e2e8f0",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,transition:"all .2s"}}>
            <div style={{fontSize:28,marginBottom:8}}>⚖️</div>
            <div>Klasik Sözleşme</div>
            <div style={{color:"#718096",fontSize:12,marginTop:6,fontWeight:400}}>Geleneksel yol</div>
            <div style={{marginTop:8,color:"#f39c12",fontSize:11}}>Doğrudan teslimat: %{Math.round(classicDeliverRate*100)}</div>
          </button>
          <button disabled={isMethodLocked} onClick={()=>handleMethodChoice("smart")} style={{padding:"20px 16px",border:`2px solid ${isMethodLocked?"rgba(255,255,255,.06)":"rgba(0,212,170,.4)"}`,borderRadius:14,cursor:isMethodLocked?"not-allowed":"pointer",opacity:isMethodLocked?.4:1,background:isMethodLocked?"transparent":"rgba(0,212,170,.08)",color:isMethodLocked?"#4a5568":"#e2e8f0",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,transition:"all .2s",boxShadow:!isMethodLocked&&isAiVariant?"0 0 30px rgba(0,212,170,.3)":"none"}}>
            {isAiVariant&&!isMethodLocked&&<div style={{fontSize:10,color:"#00d4aa",fontWeight:700,letterSpacing:1,marginBottom:4}}>✦ ÖNERİLEN</div>}
            <div style={{fontSize:28,marginBottom:8}}>⚡</div>
            <div>Smart Contract</div>
            <div style={{color:isMethodLocked?"#2d3748":"#718096",fontSize:12,marginTop:6,fontWeight:400}}>Otomatik icra</div>
          </button>
        </div>
        <button onClick={()=>setPhase("select_bot")} style={{marginTop:16,padding:"8px 20px",background:"transparent",border:"none",color:"#4a5568",cursor:"pointer",fontSize:13}}>← Bot Değiştir</button>
      </div>
    );
  }

  if (phase==="sc_architect"&&selectedBot) return (
    <div style={cardStyle}>
      <ContractModal bot={selectedBot} trustScore={trustScores[selectedBot.id]||50} onExecute={handleSCExecute} onBack={()=>setPhase("choose_method")} dominoBump={dominoBump} crashActive={crashActive} eventEffect={eventEffect}/>
    </div>
  );

  if (phase==="sc_executing") return (
    <div style={{...cardStyle,textAlign:"center"}}>
      {/* v3b: smooth progress bar replaces spinner */}
      <div style={{fontSize:40,marginBottom:16,animation:"float 2s ease-in-out infinite"}}>⛓️</div>
      <div style={{color:"#00d4aa",fontFamily:"'Space Mono',monospace",fontSize:13,marginBottom:8,letterSpacing:2}}>KONTRAT KİLİTLENİYOR</div>
      <div style={{height:6,background:"rgba(255,255,255,.08)",borderRadius:3,overflow:"hidden",margin:"12px 0"}}>
        <div style={{height:"100%",width:`${execProgress}%`,background:"linear-gradient(90deg,#00d4aa,#0099ff)",borderRadius:3,transition:"width .04s linear"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#4a5568",marginBottom:16}}>
        <span>{execProgress<30?"İmza doğrulanıyor…":execProgress<60?"Blok onayı bekleniyor…":execProgress<85?"Oracle verisi çekiliyor…":"Sözleşme aktif hale geliyor…"}</span>
        <span style={{fontFamily:"'Space Mono',monospace",color:"#00d4aa"}}>{execProgress}%</span>
      </div>
      <div style={{fontFamily:"'Space Mono',monospace",fontSize:10,color:"#2d3748"}}>{contractId}</div>
    </div>
  );

  // v3b: bilateral trade shipping animation
  if (phase==="classic_shipping"&&selectedBot) return (
    <div style={cardStyle}>
      <DeliveryShipping
        bot={selectedBot}
        deliveryTimeMult={eventEffect?.deliveryTimeMult||1}
        willSucceed={pendingDeliverySuccess}
        onDelivered={handleShippingDelivered}
        onFailed={handleShippingFailed}
      />
    </div>
  );

  // v3b: delivery confirmation — player clicks to confirm receipt
  if (phase==="classic_delivery_confirm"&&outcome&&selectedBot) return (
    <div style={winCardStyle}>
      {showConfetti&&<ConfettiOverlay onDone={()=>setShowConfetti(false)}/>}
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:52}}>✅</div>
        <h3 style={{color:"#00d4aa",fontSize:22,marginTop:8,marginBottom:4}}>Teslimat Onaylandı</h3>
        <p style={{color:"#718096",fontSize:13}}>{selectedBot.name} karşılıklı yükümlülüğünü yerine getirdi.</p>
      </div>
      <LegalReceipt title="İKİLİ TİCARET — BAŞARILI TESLİMAT" color="#00d4aa"
        entries={[{label:"Ödenen",value:`${selectedBot.basePrice} JC`,accent:"#718096"},{label:"Alınan",value:`${outcome.reward} JC`,accent:"#00d4aa",bold:true},{label:"Mahkeme harcı",value:"0 JC",accent:"#00d4aa"},{label:"Teslimat",value:"Onaylandı ✅",accent:"#00d4aa"}]}
        total={`+${outcome.profit} JC`}
      />
      <button onClick={handleDeliveryConfirm} style={{width:"100%",marginTop:16,padding:"14px 0",background:"linear-gradient(135deg,#00d4aa,#0099ff)",border:"none",borderRadius:10,color:"#060a10",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer"}}>Ekonomik Analizi Gör →</button>
    </div>
  );

  if (phase==="classic_lawyer"&&selectedBot) return (
    <div style={cardStyle}>
      <div style={{background:"rgba(255,107,53,.08)",border:"1px solid rgba(255,107,53,.2)",borderRadius:10,padding:14,marginBottom:20,fontSize:13,color:"#f6ad55"}}>
        <strong>{selectedBot.emoji} {selectedBot.name}:</strong> "{pickRandom(selectedBot.dialogues.fail)}"
      </div>
      <LawyerSelect bot={selectedBot} onSelect={handleLawyerSelect} simYear={simYear}/>
    </div>
  );

  if (phase==="classic_tunnel"&&selectedBot&&selectedLawyer) {
    const isArb=legalMode==="arbitration";
    return <div style={cardStyle}><TimeTunnel bot={selectedBot} lawyer={selectedLawyer} mode={legalMode} isArb={isArb} onComplete={handleTunnelComplete}/></div>;
  }

  if (phase==="sc_result"&&outcome) {
    const totalCost=scExecData?.totalCost||0;
    const cardS = outcome.success ? winCardStyle : lossCardStyle;
    return (
      <div style={cardS}>
        {showConfetti&&<ConfettiOverlay onDone={()=>setShowConfetti(false)}/>}
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:52}}>{outcome.success?"✅":"🔄"}</div>
          <h3 style={{color:outcome.success?"#00d4aa":"#f39c12",fontSize:22,marginTop:8,marginBottom:4}}>{outcome.success?"Teslimat Başarılı":"Otomatik İade"}</h3>
          {!outcome.success&&(
            <div style={{background:"rgba(0,212,170,.08)",border:"1px solid rgba(0,212,170,.2)",borderRadius:10,padding:12,marginTop:12,animation:"refundPop .5s ease-out"}}>
              <div style={{color:"#00d4aa",fontWeight:700,fontSize:16}}>🔒 Paran Güvende</div>
              <div style={{color:"#68d391",fontSize:13,marginTop:4}}>{outcome.refunded} JC anında iade edildi</div>
            </div>
          )}
        </div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:"#4a5568",textAlign:"center",marginBottom:16}}>{contractId}</div>
        <LegalReceipt title="SMART CONTRACT ÖZETI" color="#00d4aa"
          entries={[{label:"Ödenen",value:`${totalCost} JC`},outcome.success?{label:"Kazanılan",value:`${outcome.reward} JC`,accent:"#00d4aa",bold:true}:{label:"İade",value:`${outcome.refunded} JC`,accent:"#00d4aa",bold:true},{label:"Net",value:`${outcome.profit>=0?"+":""}${outcome.profit} JC`,accent:outcome.profit>=0?"#00d4aa":"#ff6b35",bold:true}]}
          total={`${outcome.profit>=0?"+":""}${outcome.profit} JC`}
        />
        <div style={{marginTop:16,padding:14,borderRadius:10,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)"}}>
          <span style={{fontSize:20}}>{selectedBot.emoji}</span>
          <span style={{color:"#a0aec0",fontSize:13,marginLeft:8,fontStyle:"italic"}}>"{outcome.dialogue}"</span>
        </div>
        <button onClick={()=>setPhase("autopsy")} style={{width:"100%",marginTop:16,padding:"14px 0",background:"linear-gradient(135deg,#00d4aa,#0099ff)",border:"none",borderRadius:10,color:"#060a10",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer"}}>Ekonomik Analizi Gör →</button>
      </div>
    );
  }

  if (phase==="classic_result"&&outcome) {
    const courtFee=legalMode==="lawsuit"?computeCourtFee(selectedBot.basePrice):computeArbitrationFee(selectedBot.basePrice);
    const lawyerFee=selectedLawyer?.fee||0;
    const cardS=outcome.success?winCardStyle:{...lossCardStyle,animation:outcome.konkordato?"konkordatoFlash 1s ease-in-out 3":showLossFlash?"lossFlash .8s ease-out":"none"};
    return (
      <div style={cardS}>
        {showConfetti&&<ConfettiOverlay onDone={()=>setShowConfetti(false)}/>}
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:52}}>{outcome.success?"🏆":outcome.konkordato?"💀":"😔"}</div>
          <h3 style={{color:outcome.success?"#00d4aa":outcome.konkordato?"#ff4444":"#f39c12",fontSize:22,marginTop:8,marginBottom:4}}>{outcome.success?"Dava Kazanıldı":outcome.konkordato?"Konkordato İlan Edildi":"Dava Kaybedildi"}</h3>
          <p style={{color:"#718096",fontSize:13}}>{outcome.yearsSpent} yıl sürdü</p>
          {outcome.konkordato&&<p style={{color:"#fc8181",fontSize:13,marginTop:8}}><LegalTermTooltip termKey="konkordato">Konkordato</LegalTermTooltip>: karşı taraf mahkeme korumasına girdi.</p>}
        </div>
        <LegalReceipt title="KLASİK YÖNTEM MALİYETİ" color="#ff6b35"
          entries={[{label:"Mahkeme / Tahkim Harcı",value:`${courtFee} JC`,accent:"#ff6b35"},{label:"Avukat Ücreti",value:`${lawyerFee} JC`,accent:"#ff6b35"},{label:"Süre",value:`${outcome.yearsSpent} yıl`},outcome.success?{label:"Tahsil edilen",value:`${outcome.reward} JC`,accent:"#00d4aa",bold:true}:{label:"Tahsil edilen",value:"0 JC",accent:"#ff4444"},{label:"Enflasyon kaybı (değer)",value:`-${autopsy?.inflationLoss||0} JC`,accent:"#ff4444"},...(outcome.inflationCost>0?[{label:"📈 Ücret artışı (enflasyon)",value:`+${outcome.inflationCost} JC`,accent:"#f6ad55"}]:[])]
          }
          total={`${outcome.profit>=0?"+":""}${outcome.profit} JC`}
        />
        <div style={{marginTop:16,padding:14,borderRadius:10,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.06)"}}>
          <span style={{fontSize:20}}>{selectedBot.emoji}</span>
          <span style={{color:"#a0aec0",fontSize:13,marginLeft:8,fontStyle:"italic"}}>"{outcome.dialogue}"</span>
        </div>
        <button onClick={()=>setPhase("autopsy")} style={{width:"100%",marginTop:16,padding:"14px 0",background:"linear-gradient(135deg,#ff6b35,#ff4444)",border:"none",borderRadius:10,color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer"}}>Smart Contract ile Karşılaştır →</button>
      </div>
    );
  }

  if (phase==="autopsy"&&autopsy&&selectedBot) return (
    <div style={cardStyle}>
      <EconomicAutopsy autopsy={autopsy} bot={selectedBot} method={outcome?.method||"classic"} onDone={handleAutopsyDone} sessionDurationMs={Date.now()-sessionStart}/>
    </div>
  );

  return null;
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const abVariant   = useRef(getABVariant()).current;
  const persisted   = useRef(loadPersisted()).current;
  const sessionStart= useRef(Date.now()).current;

  const [activeModule, setActiveModule]           = useState("full_simulation");
  const [coins, setCoins]                         = useState(()=>persisted?.coins??INITIAL_COINS);
  const [trustScores, setTrustScores]             = useState(()=>persisted?.trustScores??initTrustScores());
  const [stats, setStats]                         = useState(()=>persisted?.stats??{wins:0,losses:0,scUses:0,classicUses:0,concordatos:0});
  const [capitalProtected, setCapitalProtected]   = useState(()=>persisted?.capitalProtected??0);
  const [legalRisk, setLegalRisk]                 = useState(()=>persisted?.legalRisk??0);
  const [sessionCount]                            = useState(()=>{ try{const n=parseInt(localStorage.getItem("jd_session_count")||"0");localStorage.setItem("jd_session_count",String(n+1));return n;}catch{return 0;} });

  // simulation calendar — starts Nov 2021
  const [simDate, setSimDate] = useState({year:LAWSUIT_START_YEAR, month:LAWSUIT_START_MONTH});
  function advanceSimDate(months) {
    setSimDate(d=>{
      const total = d.year*12 + d.month + months;
      return {year:Math.floor(total/12), month:total%12};
    });
  }

  // v2.6 random event system
  const [contractCount, setContractCount]         = useState(0);
  const [activeEvent, setActiveEvent]             = useState(null);
  const [eventEffect, setEventEffect]             = useState(null);
  const nextEventAtRef = useRef(2+Math.floor(Math.random()*2));

  // consent banner — shown once, dismissed to localStorage
  const [showConsent, setShowConsent] = useState(()=>{ try{ return !localStorage.getItem("jd_consent_given"); }catch{ return true; } });
  function handleConsentAccept() { try{ localStorage.setItem("jd_consent_given","1"); }catch{} setShowConsent(false); }

  // v2.7 insolvency
  const [showInsolvency, setShowInsolvency]       = useState(false);
  const insolvencyHandledRef                      = useRef(false);

  // v2.7 loan request
  const [pendingLoanRequest, setPendingLoanRequest] = useState(null);
  const [loanState, setLoanState]                 = useState(null); // null | "lending" | "defaulted"
  const [activeLoan, setActiveLoan]               = useState(null); // {bot,amount,interest}
  const [showMiniLawsuit, setShowMiniLawsuit]     = useState(false);
  const loanTriggerRef = useRef(LOAN_TRIGGER_EVERY);

  // ── Insolvency check ──
  useEffect(()=>{
    if (coins>0 && coins<BANKRUPTCY_THRESHOLD && !showInsolvency && !insolvencyHandledRef.current) {
      setShowInsolvency(true);
      insolvencyHandledRef.current=true;
      track("INSOLVENCY",{coinsAtTrigger:coins});
    }
    if (coins>=BANKRUPTCY_THRESHOLD) { insolvencyHandledRef.current=false; }
  },[coins]);

  function handleConcordato() {
    const loss = Math.floor(coins*0.30);
    const newCoins = Math.max(coins-loss, BANKRUPTCY_THRESHOLD+50);
    setCoins(newCoins);
    setStats(s=>({...s,concordatos:(s.concordatos||0)+1}));
    setShowInsolvency(false);
    track("CONCORDATO",{coinsLost:loss,coinsRemaining:newCoins});
  }

  function handleBankruptcy() {
    setCoins(INITIAL_COINS);
    setTrustScores(initTrustScores());
    setStats({wins:0,losses:0,scUses:0,classicUses:0,concordatos:0});
    setCapitalProtected(0);
    setLegalRisk(0);
    setShowInsolvency(false);
    insolvencyHandledRef.current=false;
    track("BANKRUPTCY",{coinsAtBankruptcy:coins});
  }

  // ── Round complete + event/loan trigger ──
  function handleRoundComplete() {
    const newCount = contractCount+1;
    setContractCount(newCount);
    // Market event
    if (newCount>=nextEventAtRef.current) {
      const event = RANDOM_EVENTS[Math.floor(Math.random()*RANDOM_EVENTS.length)];
      setActiveEvent(event);
      nextEventAtRef.current=newCount+2+Math.floor(Math.random()*2);
    }
    // Loan request
    if (newCount>=loanTriggerRef.current && !pendingLoanRequest) {
      const bot = BOTS[Math.floor(Math.random()*BOTS.length)];
      const amount = bot.loanAmount;
      if (coins > amount*1.5) {
        setPendingLoanRequest({bot, amount, repayRate:bot.loanRepayRate});
        loanTriggerRef.current = newCount+LOAN_TRIGGER_EVERY+Math.floor(Math.random()*3);
      }
    }
  }

  function handleEventDismiss() {
    if (!activeEvent) return;
    const eff = activeEvent.effect;
    setEventEffect(eff);
    if (eff?.coinBonus) setCoins(c=>c+eff.coinBonus); // v3b: direct coin bonus
    setActiveEvent(null);
    track("RANDOM_EVENT",{eventId:activeEvent.id,type:activeEvent.type,coinBonus:eff?.coinBonus||0});
  }

  // ── Loan actions ──
  function handleLend(amount, interest) {
    setCoins(c=>c-amount);
    setActiveLoan({bot:pendingLoanRequest.bot, amount, interest, repayRate:pendingLoanRequest.repayRate});
    setPendingLoanRequest(null);
    setLoanState("lending");
    track("LOAN_GIVEN",{botId:pendingLoanRequest.bot.id,amount});
    // Roll repayment after delay
    const willRepay = Math.random()<pendingLoanRequest.repayRate;
    setTimeout(()=>{
      if (willRepay) {
        const repayAmt = amount+interest;
        setCoins(c=>c+repayAmt);
        setActiveLoan(prev=>({...prev,repaid:true,repayAmt}));
        setLoanState("repaid");
        track("LOAN_REPAID",{botId:pendingLoanRequest.bot?.id||"unknown",amount,repayAmt});
      } else {
        setLoanState("defaulted");
        track("LOAN_DEFAULT",{botId:activeLoan?.bot?.id||"unknown",amount});
      }
    }, 2000);
  }

  function handleLoanRefuse() {
    setPendingLoanRequest(null);
    track("LOAN_REFUSED",{botId:pendingLoanRequest?.bot?.id});
  }

  function handleMiniLawsuitComplete({won, recover, courtFee}) {
    if (won) setCoins(c=>c+recover-courtFee);
    else setCoins(c=>c-courtFee);
    setShowMiniLawsuit(false);
    setLoanState(null);
    setActiveLoan(null);
  }

  // Persist
  useEffect(()=>{ savePersisted({coins,trustScores,stats,capitalProtected,legalRisk}); },[coins,trustScores,stats,capitalProtected,legalRisk]);
  useEffect(()=>{
    track("SESSION_START",{timestamp:Date.now(),abVariant});
    const h=()=>track("EXIT_INTENT",{lastInteraction:activeModule,sessionDurationMs:Date.now()-sessionStart});
    window.addEventListener("beforeunload",h);
    return ()=>window.removeEventListener("beforeunload",h);
  },[]);

  const playerReputation = computePlayerReputation(trustScores);
  const MODULES = [
    {id:"full_simulation",label:"Tam Simülasyon",emoji:"🎮",desc:"3-5 dk"},
    {id:"comparison_tool",label:"Karşılaştır",emoji:"📊",desc:"2 dk"},
  ];

  return (
    <JusErrorBoundary>
      <style>{GLOBAL_CSS}</style>
      <div style={{minHeight:"100vh",background:"#060a10",color:"#e2e8f0"}}>

        {/* Consent / info banner — shown once */}
        {showConsent && (
          <div style={{position:"fixed",inset:0,background:"rgba(6,10,16,.92)",backdropFilter:"blur(6px)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
            <div style={{background:"#0d1421",border:"1px solid rgba(0,212,170,.25)",borderRadius:20,padding:"40px 36px",maxWidth:480,width:"100%",textAlign:"center",boxShadow:"0 24px 64px rgba(0,0,0,.6)"}}>
              <div style={{fontSize:44,marginBottom:16}}>⚖️</div>
              <h2 style={{color:"#e2e8f0",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,marginBottom:14,lineHeight:1.3}}>
                JusDigitalis Smart Contract Sandbox
              </h2>
              <p style={{color:"#a0aec0",fontSize:14,lineHeight:1.7,marginBottom:28}}>
                Bu simülasyon eğitim amaçlıdır. Tüm veriler anonimdir — kişisel bilgi toplanmaz.
              </p>
              <button onClick={handleConsentAccept} style={{width:"100%",padding:"14px 0",border:"none",borderRadius:12,background:"linear-gradient(135deg,#00d4aa,#0099ff)",color:"#060a10",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer",letterSpacing:.4}}>
                Simülasyonu Başlat →
              </button>
              <p style={{color:"#4a5568",fontSize:11,marginTop:20}}>© JusDigitalis — Hukuk Mühendisliği</p>
            </div>
          </div>
        )}

        {/* v2.7: Insolvency modal */}
        {showInsolvency && (
          <InsolvencyModal coins={coins} onConcordato={handleConcordato} onBankruptcy={handleBankruptcy}/>
        )}

        {/* v2.7: Loan request modal */}
        {pendingLoanRequest && !showInsolvency && (
          <LoanRequestModal request={pendingLoanRequest} coins={coins} onLend={handleLend} onRefuse={handleLoanRefuse}/>
        )}

        {/* v2.7: Loan repaid / defaulted toast */}
        {loanState==="repaid" && activeLoan && (
          <div style={{position:"fixed",bottom:32,right:32,background:"rgba(0,212,170,.15)",border:"2px solid rgba(0,212,170,.4)",borderRadius:16,padding:"16px 22px",zIndex:600,maxWidth:320,animation:"loanIn .4s ease-out"}}>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:24}}>{activeLoan.bot.emoji}</span>
              <div>
                <div style={{color:"#00d4aa",fontWeight:700,fontSize:14}}>{activeLoan.bot.name} geri ödedi!</div>
                <div style={{color:"#68d391",fontSize:13}}>+{activeLoan.amount+activeLoan.interest} JC (faizli)</div>
              </div>
            </div>
            <p style={{color:"#718096",fontSize:12,fontStyle:"italic"}}>"{pickRandom(activeLoan.bot.dialogues.loanRepay)}"</p>
            <button onClick={()=>{setLoanState(null);setActiveLoan(null);}} style={{marginTop:10,width:"100%",padding:"8px 0",background:"rgba(0,212,170,.2)",border:"1px solid rgba(0,212,170,.4)",borderRadius:8,color:"#00d4aa",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,cursor:"pointer"}}>Tamam</button>
          </div>
        )}
        {loanState==="defaulted" && activeLoan && !showMiniLawsuit && (
          <div style={{position:"fixed",bottom:32,right:32,background:"rgba(255,68,68,.1)",border:"2px solid rgba(255,68,68,.35)",borderRadius:16,padding:"16px 22px",zIndex:600,maxWidth:340,animation:"loanIn .4s ease-out"}}>
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:24}}>{activeLoan.bot.emoji}</span>
              <div>
                <div style={{color:"#ff4444",fontWeight:700,fontSize:14}}>{activeLoan.bot.name} ödeme yapmadı!</div>
                <div style={{color:"#fc8181",fontSize:13}}>{activeLoan.amount} JC geri gelmedi</div>
              </div>
            </div>
            <p style={{color:"#718096",fontSize:12,fontStyle:"italic",marginBottom:12}}>"{pickRandom(activeLoan.bot.dialogues.loanDefault)}"</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <button onClick={()=>{setLoanState(null);setActiveLoan(null);}} style={{padding:"8px 0",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,color:"#a0aec0",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:12,cursor:"pointer"}}>Vazgeç</button>
              <button onClick={()=>setShowMiniLawsuit(true)} style={{padding:"8px 0",background:"rgba(255,107,53,.2)",border:"1px solid rgba(255,107,53,.4)",borderRadius:8,color:"#f6ad55",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer"}}>Dava Aç ⚖️</button>
            </div>
          </div>
        )}
        {showMiniLawsuit && activeLoan && (
          <MiniLawsuitModal bot={activeLoan.bot} loanAmount={activeLoan.amount} onComplete={handleMiniLawsuitComplete}/>
        )}

        {/* Market event modal */}
        {activeEvent && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
            <div style={{background:"#0d1b2a",border:`2px solid ${activeEvent.type==="positive"?"rgba(0,212,170,.5)":"rgba(255,68,68,.5)"}`,borderRadius:20,padding:36,maxWidth:480,width:"100%",textAlign:"center",animation:"eventIn .4s ease-out"}}>
              <div style={{fontSize:64,marginBottom:16}}>{activeEvent.emoji}</div>
              <div style={{color:activeEvent.type==="positive"?"#00d4aa":"#ff4444",fontSize:11,letterSpacing:2,marginBottom:10,fontFamily:"'Space Mono',monospace",fontWeight:700}}>{activeEvent.type==="positive"?"✦ POZİTİF OLAY":"⚠️ NEGATİF OLAY"}</div>
              <h3 style={{color:"#e2e8f0",fontSize:24,marginBottom:12}}>{activeEvent.title}</h3>
              <p style={{color:"#a0aec0",fontSize:14,lineHeight:1.7,marginBottom:28}}>{activeEvent.description}</p>
              <button onClick={handleEventDismiss} style={{padding:"14px 48px",background:activeEvent.type==="positive"?"linear-gradient(135deg,#00d4aa,#0099ff)":"linear-gradient(135deg,#ff4444,#ff6b35)",border:"none",borderRadius:12,color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer"}}>Devam Et →</button>
            </div>
          </div>
        )}

        {/* Active event banner */}
        {eventEffect && !activeEvent && (
          <div style={{background:eventEffect.rewardBonus||eventEffect.successBonus||eventEffect.dominoBumpReduce?"rgba(0,212,170,.08)":"rgba(255,68,68,.08)",borderBottom:`1px solid ${eventEffect.rewardBonus||eventEffect.successBonus||eventEffect.dominoBumpReduce?"rgba(0,212,170,.2)":"rgba(255,68,68,.2)"}`,padding:"8px 24px",textAlign:"center",fontSize:12,color:eventEffect.rewardBonus||eventEffect.successBonus||eventEffect.dominoBumpReduce?"#68d391":"#fc8181"}}>
            {eventEffect.rewardBonus&&`✦ Aktif: Sermaye Akışı — ödüller +%${Math.round(eventEffect.rewardBonus*100)}`}
            {eventEffect.successBonus&&` ✦ Başarı oranları +%${Math.round(eventEffect.successBonus*100)}`}
            {eventEffect.scSuccessBonus&&` ✦ SC bonus +%${Math.round(eventEffect.scSuccessBonus*100)}`}
            {eventEffect.crashActive&&"⚠️ Aktif: Pandemi Şoku — piyasa krizi devam ediyor"}
            {eventEffect.rewardPenalty&&` ⚠️ Döviz Krizi — ödüller -%${Math.round(eventEffect.rewardPenalty*100)}`}
            {eventEffect.deliveryTimeMult&&eventEffect.deliveryTimeMult>1&&` ⚠️ Tedarik Krizi — teslimat ×${eventEffect.deliveryTimeMult}`}
            {eventEffect.dominoBump&&` ⚠️ Domino riski +%${Math.round(eventEffect.dominoBump*100)}`}
          </div>
        )}

        {/* Header */}
        <header style={{borderBottom:"1px solid rgba(255,255,255,.06)",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:22,color:"#00d4aa",letterSpacing:2}}>
              JUS DIGITALIS
              <span style={{fontFamily:"'Space Mono',monospace",color:"#4a5568",fontSize:12,marginLeft:8,fontWeight:400}}>v2.7.3a</span>
            </div>
            <div style={{color:"#4a5568",fontSize:11,marginTop:2}}>Rnd Lawsuit · TK Opportunity Cost · Sim Analytics</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <SocialProofWidget/>
            <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(0,153,255,.08)",border:"1px solid rgba(0,153,255,.2)",borderRadius:12,padding:"8px 14px"}}>
              <span style={{fontSize:14}}>📅</span>
              <span style={{fontFamily:"'Space Mono',monospace",color:"#63b3ed",fontWeight:700,fontSize:13,letterSpacing:.5}}>
                {TR_MONTHS[simDate.month]} {simDate.year}
              </span>
            </div>
            <PlayerReputationDisplay score={playerReputation}/>
            <CoinDisplay coins={coins}/>
          </div>
        </header>

        {/* Nav */}
        <nav style={{borderBottom:"1px solid rgba(255,255,255,.06)",padding:"0 24px",display:"flex",gap:4,overflowX:"auto"}}>
          {MODULES.map(m=>(
            <button key={m.id} onClick={()=>setActiveModule(m.id)} style={{padding:"14px 20px",border:"none",background:"transparent",cursor:"pointer",color:activeModule===m.id?"#00d4aa":"#718096",fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:13,borderBottom:`2px solid ${activeModule===m.id?"#00d4aa":"transparent"}`,transition:"all .2s",display:"flex",gap:6,alignItems:"center",whiteSpace:"nowrap"}}>
              <span>{m.emoji}</span>{m.label}
              <span style={{color:"#4a5568",fontSize:11,fontWeight:400}}>{m.desc}</span>
            </button>
          ))}
        </nav>

        {/* Main */}
        <main style={{padding:"32px 24px",maxWidth:760,margin:"0 auto"}}>

          {(stats.wins+stats.losses)>0&&(
            <div style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"}}>
              {[
                {label:"Kazanılan",value:stats.wins,color:"#00d4aa"},
                {label:"Kaybedilen",value:stats.losses,color:"#ff4444"},
                {label:"SC Kullanımı",value:stats.scUses,color:"#0099ff"},
                {label:"Korunan Sermaye",value:`${capitalProtected} JC`,color:"#9b59b6"},
                {label:"İtibar Puanı",value:`${playerReputation}/100`,color:getReputationBadge(playerReputation).color},
                ...(stats.concordatos>0?[{label:"Konkordato",value:stats.concordatos,color:"#f39c12"}]:[]),
              ].map((s,i)=>(
                <div key={i} style={{background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.06)",borderRadius:10,padding:"10px 16px"}}>
                  <div style={{color:s.color,fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:16}}>{s.value}</div>
                  <div style={{color:"#4a5568",fontSize:11}}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {activeModule==="full_simulation"&&(
            <FullSimulation
              abVariant={abVariant}
              coins={coins} setCoins={setCoins}
              trustScores={trustScores} setTrustScores={setTrustScores}
              stats={stats} setStats={setStats}
              capitalProtected={capitalProtected} setCapitalProtected={setCapitalProtected}
              legalRisk={legalRisk} setLegalRisk={setLegalRisk}
              sessionStart={sessionStart}
              eventEffect={eventEffect}
              onRoundComplete={handleRoundComplete}
              simYear={simDate.year}
              onAdvanceSimDate={advanceSimDate}
            />
          )}

          {activeModule==="comparison_tool"&&(
            <ComparisonTool onBack={()=>setActiveModule("full_simulation")}/>
          )}

          <div style={{marginTop:48,paddingTop:24,borderTop:"1px solid rgba(255,255,255,.06)",display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center"}}>
            {Object.keys(LEGAL_TERMS).map(k=><LegalTermTooltip key={k} termKey={k}/>)}
          </div>

          <div style={{textAlign:"center",marginTop:24,color:"#2d3748",fontSize:11,fontFamily:"'Space Mono',monospace"}}>
            JUS DIGITALIS v2.7.3a — Simülasyon amaçlıdır. Hukuki tavsiye niteliği taşımaz.
          </div>
        </main>
      </div>
    </JusErrorBoundary>
  );
}
