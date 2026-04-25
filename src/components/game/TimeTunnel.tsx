import { useState, useEffect, useRef, useMemo } from 'react'
import type { Bot, Lawyer } from '../../types'
import { KONKORDATO_CHANCE, LAWSUIT_START_YEAR, INFLATION_BY_YEAR, LAWSUIT_YEARS_BY_BOT, ARBITRATION_YEARS_BY_BOT } from '../../constants/game'
import { JUDGE_EMOJI, JUDGE_NAME } from '../../constants/judge'
import { computeCourtFee, computeArbitrationFee, buildYearEvents, getJudgeDialogue, pickRandom } from '../../utils/math'

const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

const LAWYER_INFLATION_RATE    = 0.09
const COURT_INFLATION_RATE     = 0.09
const BOT_PRICE_INFLATION_RATE = 0.15
const LAWSUIT_START_MONTH      = 10
const MS_PER_TUNNEL_YEAR       = 5000

interface ComplexityEvent {
  prob: number
  label: string
  addYears: number
  color: string
}

const COMPLEXITY_EVENTS: Record<string, ComplexityEvent> = {
  rookie_miss:   { prob: 0.18, label: '⚠️ Avukat dosya süresini kaçırdı — dava 1 yıl uzadı!', addYears: 1, color: '#ff4444' },
  opp_delay:     { prob: 0.12, label: '📋 Karşı taraf ek süre talep etti. Mahkeme kabul etti.',  addYears: 0, color: '#f39c12' },
  witness_added: { prob: 0.08, label: '🧑‍⚖️ Yeni tanık listesi sunuldu. Süreç uzuyor.',            addYears: 0, color: '#f39c12' },
  doc_missing:   { prob: 0.10, label: '📁 Kritik belge eksik — noter tasdiki istendi.',            addYears: 0, color: '#f39c12' },
}

interface TimeTunnelProps {
  bot: Bot
  lawyer: Lawyer
  isArb: boolean
  onComplete: (result: { won: boolean; konkordato: boolean; totalYears: number; isArb: boolean; totalInflationCost: number }) => void
}

export function TimeTunnel({ bot, lawyer, isArb, onComplete }: TimeTunnelProps) {
  const yearsRange = isArb ? ARBITRATION_YEARS_BY_BOT[bot.id] : LAWSUIT_YEARS_BY_BOT[bot.id]
  const [maxYears, setMaxYears] = useState(() => yearsRange.min + Math.floor(Math.random() * (yearsRange.max - yearsRange.min + 1)))
  const maxYearsRef = useRef(maxYears)
  useEffect(() => { maxYearsRef.current = maxYears }, [maxYears])

  const initialLawyerFee = lawyer.fee
  const initialCourtFee  = isArb ? computeArbitrationFee(bot.basePrice) : computeCourtFee(bot.basePrice)
  const lawyerFeeAt = (y: number) => Math.round(initialLawyerFee * Math.pow(1 + LAWYER_INFLATION_RATE, y))
  const courtFeeAt  = (y: number) => Math.round(initialCourtFee  * Math.pow(1 + COURT_INFLATION_RATE, y))
  const botPriceAt  = (y: number) => Math.round(bot.basePrice    * Math.pow(1 + BOT_PRICE_INFLATION_RATE, y))

  const baseYearEvents = useMemo(() => buildYearEvents(maxYears, isArb), [])
  const [currentYear, setCurrentYear] = useState(0)
  const [log, setLog] = useState<Array<{
    year: number; courtText: string; judgeText: string; winProb: number
    complexityEvent: ComplexityEvent | null
    inflationEvent: { year: number; calYear: number; oldLawyer: number; newLawyer: number; oldCourt: number; newCourt: number; oldBotPrice: number; newBotPrice: number; delta: number } | null
  }>>([])
  const [done, setDone] = useState(false)
  const [finalWon, setFinalWon] = useState(false)
  const [konkordato, setKonkordato] = useState(false)
  const [totalInflationCost, setTotalInflationCost] = useState(0)
  const inflCostRef = useRef(0)
  const skipRef = useRef<(() => void) | null>(null)

  const [msElapsed, setMsElapsed] = useState(0)
  const msElapsedRef = useRef(0)
  const MS_PER_MONTH = MS_PER_TUNNEL_YEAR / 12
  const totalMonthsElapsed = Math.floor(msElapsed / MS_PER_MONTH)
  const calYear     = LAWSUIT_START_YEAR  + Math.floor((LAWSUIT_START_MONTH + totalMonthsElapsed) / 12)
  const calMonthIdx = (LAWSUIT_START_MONTH + totalMonthsElapsed) % 12
  const yearsElapsed  = Math.floor(totalMonthsElapsed / 12)
  const monthsInYear  = totalMonthsElapsed % 12

  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (done) return
    const iv = setInterval(() => {
      msElapsedRef.current += 100
      setMsElapsed(msElapsedRef.current)
    }, 100)
    return () => clearInterval(iv)
  }, [done])

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [log])

  useEffect(() => {
    if (done) return
    if (currentYear >= maxYearsRef.current) {
      const lastIdx = Math.min(currentYear - 1, baseYearEvents.length - 1)
      const lastWinProb = baseYearEvents[lastIdx]?.winProb || 0.5
      const adjustedWinProb = Math.min(lastWinProb * lawyer.winMultiplier, 0.95)
      const won = Math.random() < adjustedWinProb
      const konk = !won && Math.random() < KONKORDATO_CHANCE
      setFinalWon(won)
      setKonkordato(konk)
      setDone(true)
      return
    }

    const doAdvance = () => {
      const evIdx = Math.min(currentYear, baseYearEvents.length - 1)
      const ev = baseYearEvents[evIdx] || { year: currentYear + 1, events: ['Dava devam ediyor...'], winProb: 0.5 }
      const courtText = pickRandom(ev.events)
      const judgeText = getJudgeDialogue(ev.year || currentYear + 1, ev.winProb)

      let complexityEvent: ComplexityEvent | null = null
      const cRoll = Math.random()
      if (lawyer.id === 'rookie' && cRoll < COMPLEXITY_EVENTS.rookie_miss.prob) {
        complexityEvent = COMPLEXITY_EVENTS.rookie_miss
        setMaxYears(m => { maxYearsRef.current = m + 1; return m + 1 })
      } else if (cRoll < COMPLEXITY_EVENTS.opp_delay.prob) {
        complexityEvent = COMPLEXITY_EVENTS.opp_delay
      } else if (cRoll < COMPLEXITY_EVENTS.opp_delay.prob + COMPLEXITY_EVENTS.witness_added.prob) {
        complexityEvent = COMPLEXITY_EVENTS.witness_added
      } else if (cRoll < COMPLEXITY_EVENTS.opp_delay.prob + COMPLEXITY_EVENTS.witness_added.prob + COMPLEXITY_EVENTS.doc_missing.prob) {
        complexityEvent = COMPLEXITY_EVENTS.doc_missing
      }

      let inflationEvent = null
      if (currentYear >= 1) {
        const oldLawyer   = lawyerFeeAt(currentYear - 1)
        const newLawyer   = lawyerFeeAt(currentYear)
        const oldCourt    = courtFeeAt(currentYear - 1)
        const newCourt    = courtFeeAt(currentYear)
        const oldBotPrice = botPriceAt(currentYear - 1)
        const newBotPrice = botPriceAt(currentYear)
        const delta = (newLawyer - oldLawyer) + (newCourt - oldCourt)
        inflCostRef.current += delta
        setTotalInflationCost(inflCostRef.current)
        inflationEvent = { year: currentYear + 1, calYear: LAWSUIT_START_YEAR + currentYear, oldLawyer, newLawyer, oldCourt, newCourt, oldBotPrice, newBotPrice, delta }
      }

      setLog(l => [...l, { year: currentYear + 1, courtText, judgeText, winProb: ev.winProb, complexityEvent, inflationEvent }])
      setCurrentYear(y => y + 1)
      skipRef.current = null
    }

    skipRef.current = doAdvance
    const timer = setTimeout(doAdvance, MS_PER_TUNNEL_YEAR)
    return () => { clearTimeout(timer); skipRef.current = null }
  }, [currentYear, done])

  if (done) {
    return (
      <div style={{ textAlign: 'center', animation: 'countUp .5s ease-out' }}>
        <div style={{ fontSize: 60, marginBottom: 12 }}>{finalWon ? '🏆' : konkordato ? '💀' : '😔'}</div>
        <h3 style={{ color: finalWon ? '#00d4aa' : konkordato ? '#ff4444' : '#f39c12', fontSize: 22, marginBottom: 8 }}>
          {finalWon ? 'Dava Kazanıldı' : konkordato ? 'Konkordato İlan Edildi' : 'Dava Kaybedildi'}
        </h3>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,153,255,.08)', border: '1px solid rgba(0,153,255,.2)', borderRadius: 10, padding: '7px 16px', marginBottom: 12, fontSize: 13, color: '#63b3ed' }}>
          📅 {TR_MONTHS[calMonthIdx]} {calYear} · Geçen Süre: {yearsElapsed} yıl {monthsInYear} ay
        </div>
        <p style={{ color: '#718096', fontSize: 13, marginBottom: 8 }}>
          {maxYears} yıl sonra paranın değeri: <strong style={{ color: '#f39c12' }}>%{Math.round((INFLATION_BY_YEAR[Math.min(maxYears, 10)] || 0.2) * 100)}</strong>
        </p>
        {totalInflationCost > 0 && (
          <div style={{ background: 'rgba(255,107,53,.08)', border: '1px solid rgba(255,107,53,.25)', borderRadius: 10, padding: '8px 16px', marginBottom: 16, fontSize: 13, color: '#f6ad55', display: 'inline-block' }}>
            📈 Süreçte artan ücretler (enflasyon): <strong style={{ color: '#ff6b35' }}>+{totalInflationCost} JC</strong>
          </div>
        )}
        <div style={{ marginBottom: 16 }} />
        <button
          onClick={() => onComplete({ won: finalWon, konkordato, totalYears: maxYears, isArb, totalInflationCost: inflCostRef.current })}
          style={{ padding: '12px 32px', background: finalWon ? 'linear-gradient(135deg,#00d4aa,#0099ff)' : 'rgba(255,255,255,.1)', border: 'none', borderRadius: 10, color: finalWon ? '#060a10' : '#e2e8f0', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
        >
          Sonucu Gör →
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ color: '#718096', fontSize: 11, marginBottom: 6, fontFamily: "'Space Mono',monospace", letterSpacing: 2 }}>
          ZAMAN TÜNELİ — {isArb ? 'TAHKİM' : 'MAHKEME'} SÜRECİ
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,153,255,.1)', border: '1px solid rgba(0,153,255,.25)', borderRadius: 8, padding: '5px 12px' }}>
            <span style={{ fontSize: 14 }}>📅</span>
            <span style={{ color: '#63b3ed', fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700 }}>{TR_MONTHS[calMonthIdx]} {calYear}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: '5px 12px' }}>
            <span style={{ fontSize: 12 }}>⏱️</span>
            <span style={{ color: '#a0aec0', fontSize: 12 }}>
              Geçen Süre: <strong style={{ color: '#e2e8f0' }}>{yearsElapsed > 0 ? `${yearsElapsed} yıl ` : ''}{monthsInYear} ay</strong>
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 24 }}>{JUDGE_EMOJI}</span>
          <div>
            <div style={{ color: '#e2e8f0', fontSize: 18, fontWeight: 700 }}>{currentYear}/{maxYears}. Yıl</div>
            <div style={{ color: '#718096', fontSize: 11 }}>{JUDGE_NAME}</div>
          </div>
        </div>
        <div style={{ height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(currentYear / Math.max(maxYears, 1)) * 100}%`, background: 'linear-gradient(90deg,#ff6b35,#ff4444)', transition: 'width 1.6s ease', borderRadius: 2 }} />
        </div>
        {!done && currentYear < maxYears && (
          <button
            onClick={() => { if (skipRef.current) { skipRef.current() } }}
            style={{
              marginTop: 8, padding: '6px 16px',
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 8, color: '#4a5568',
              fontFamily: "'Syne',sans-serif", fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Hızlandır ⏩
          </button>
        )}
      </div>

      <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {log.map((entry, i) => (
          <div key={i} style={{ borderRadius: 12, overflow: 'hidden', animation: 'slideIn .4s ease-out' }}>
            <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '12px 12px 0 0', padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ color: '#f39c12', fontFamily: "'Space Mono',monospace", fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0, paddingTop: 1 }}>{entry.year}. YIL</span>
              <span style={{ color: '#a0aec0', fontSize: 13 }}>{entry.courtText}</span>
            </div>
            {entry.complexityEvent && (
              <div style={{ background: 'rgba(255,68,68,.06)', borderLeft: `3px solid ${entry.complexityEvent.color}`, borderRight: '1px solid rgba(255,255,255,.06)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '7px 14px', display: 'flex', gap: 8, alignItems: 'center', animation: 'judgeIn .3s ease-out' }}>
                <span style={{ color: entry.complexityEvent.color, fontSize: 12, fontWeight: 700 }}>{entry.complexityEvent.label}</span>
                {entry.complexityEvent.addYears > 0 && <span style={{ fontSize: 10, background: 'rgba(255,68,68,.15)', color: '#fc8181', borderRadius: 4, padding: '1px 6px' }}>+{entry.complexityEvent.addYears} yıl</span>}
              </div>
            )}
            {entry.inflationEvent && (
              <div style={{ background: 'rgba(255,107,53,.06)', borderLeft: '3px solid #ff6b35', borderRight: '1px solid rgba(255,255,255,.06)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '8px 14px', animation: 'judgeIn .3s ease-out' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ color: '#ff6b35', fontSize: 12, fontWeight: 700 }}>
                    📈 {entry.inflationEvent.calYear}: Avukat ücreti {entry.inflationEvent.oldLawyer}→{entry.inflationEvent.newLawyer} JC
                  </span>
                  <span style={{ fontSize: 10, background: 'rgba(255,107,53,.15)', color: '#f6ad55', borderRadius: 4, padding: '1px 6px', flexShrink: 0, whiteSpace: 'nowrap' }}>+{entry.inflationEvent.delta} JC</span>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ color: '#718096', fontSize: 11 }}>Harç: {entry.inflationEvent.oldCourt}→<strong style={{ color: '#f6ad55' }}>{entry.inflationEvent.newCourt} JC</strong></span>
                  <span style={{ color: '#718096', fontSize: 11 }}>Sözleşme değeri: {entry.inflationEvent.oldBotPrice}→<strong style={{ color: '#fc8181' }}>{entry.inflationEvent.newBotPrice} JC</strong> (+%{Math.round(BOT_PRICE_INFLATION_RATE * 100)})</span>
                </div>
              </div>
            )}
            <div style={{ background: 'rgba(255,255,255,.015)', borderLeft: '3px solid rgba(243,156,18,.4)', borderRight: '1px solid rgba(255,255,255,.06)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '8px 14px', display: 'flex', gap: 10, alignItems: 'flex-start', animation: 'judgeIn .3s ease-out' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{JUDGE_EMOJI}</span>
              <div>
                <span style={{ color: '#f39c12', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>{JUDGE_NAME}: </span>
                <span style={{ color: '#718096', fontSize: 12, fontStyle: 'italic' }}>"{entry.judgeText}"</span>
              </div>
            </div>
          </div>
        ))}
        {currentYear < maxYears && (
          <div style={{ textAlign: 'center', padding: '20px 16px', color: '#4a5568', fontSize: 12 }}>
            <div style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(243,156,18,.5)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1.2s linear infinite', marginBottom: 8 }} />
            <div>{JUDGE_EMOJI} Duruşma devam ediyor…</div>
          </div>
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  )
}
