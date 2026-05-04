import { Component, type ReactNode, useState, useEffect, useRef } from 'react'
import { useGameState } from './hooks/useGameState'
import { Header } from './components/layout/Header'
import { BotCard } from './components/game/BotCard'
import { ContractBuilder } from './components/game/ContractBuilder'
import { DeliveryShipping } from './components/game/DeliveryShipping'
import { LawyerSelect } from './components/game/LawyerSelect'
import { TimeTunnel } from './components/game/TimeTunnel'
import { EconomicAutopsy } from './components/game/EconomicAutopsy'
import { ConfettiOverlay } from './components/ui/ConfettiOverlay'
import { BankruptcyModal } from './components/modals/BankruptcyModal'
import { LoanModal } from './components/modals/LoanModal'
import { MiniLawsuit } from './components/modals/MiniLawsuit'
import { LegalTermTooltip } from './components/ui/Tooltip'
import { BOTS } from './constants/bots'
import { LEGAL_TERMS } from './constants/legalTerms'
import { RANDOM_EVENTS } from './constants/events'
import {
  BANKRUPTCY_THRESHOLD, LOAN_TRIGGER_EVERY,
  INFLATION_BY_YEAR, DOMINO_FAILURE_BUMP, DOMINO_RECOVERY, ORACLE_FEE,
} from './constants/game'
import {
  computeDynamicReward, computeSuccessRate, computeClassicDirectRate,
  computeAutopsy, computeCourtFee, computeArbitrationFee,
  genContractId, pickRandom,
} from './utils/math'
import { applyTrustUpdate, computePlayerReputation, getReputationBadge } from './utils/trust'
import { track, logSimulation } from './utils/analytics'
import type { Bot, Lawyer, ContractParams } from './types'
import { botEvaluateContract } from './utils/trust'
import { useCoinAnimation } from './hooks/useCoinAnimation'
import { loadPersisted, clearPersisted } from './utils/persistence'
import { useIsMobile } from './hooks/useIsMobile'
import { useABVariant } from './hooks/useABVariant'

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; canRecover: boolean }
> {
  state = { hasError: false, canRecover: false }

  static getDerivedStateFromError() {
    const saved = loadPersisted()
    return { hasError: true, canRecover: saved !== null }
  }

  componentDidCatch(err: Error) {
    track('SIM_DATA', { type: 'ERROR', message: err.message })
  }

  handleRecover = () => {
    this.setState({ hasError: false, canRecover: false })
  }

  handleReset = () => {
    clearPersisted()
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{
        color: '#e2e8f0', background: '#060a10', minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 16, padding: 40, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <h2 style={{ color: '#ff4444', fontFamily: "'Syne',sans-serif" }}>Sistem Hatası</h2>
        <p style={{ color: '#a0aec0', maxWidth: 320, lineHeight: 1.6 }}>
          Beklenmeyen bir hata oluştu.
        </p>
        {this.state.canRecover && (
          <button
            onClick={this.handleRecover}
            style={{
              background: 'linear-gradient(135deg,#00d4aa,#0099ff)', color: '#060a10',
              border: 'none', padding: '12px 28px', borderRadius: 8,
              cursor: 'pointer', fontWeight: 700, fontFamily: "'Syne',sans-serif", fontSize: 14,
            }}
          >
            Kaldığın Yerden Devam Et
          </button>
        )}
        <button
          onClick={this.handleReset}
          style={{
            background: 'transparent', color: '#718096',
            border: '1px solid rgba(255,255,255,.1)',
            padding: '10px 24px', borderRadius: 8,
            cursor: 'pointer', fontFamily: "'Syne',sans-serif", fontSize: 13,
          }}
        >
          Sıfırla ve Yeniden Başla
        </button>
      </div>
    )
  }
}

// ─── LEGAL RECEIPT ────────────────────────────────────────────────────────────
function LegalReceipt({ entries, title, total, color = '#00d4aa' }: {
  entries: Array<{ label: string; value: string; accent?: string; bold?: boolean }>
  title: string; total: string; color?: string
}) {
  return (
    <div style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 20, fontFamily: "'Space Mono',monospace", animation: 'receiptIn .4s ease-out' }}>
      <div style={{ color, fontSize: 12, fontWeight: 700, marginBottom: 12, letterSpacing: 2 }}>{title}</div>
      {entries.map((e, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.04)', color: e.accent || '#718096', fontSize: 12 }}>
          <span>{e.label}</span><span style={{ fontWeight: e.bold ? 700 : 400 }}>{e.value}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', color, fontSize: 14, fontWeight: 700, borderTop: `1px solid ${color}44`, marginTop: 4 }}>
        <span>TOPLAM</span><span>{total}</span>
      </div>
    </div>
  )
}

const cardStyle = { background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 20, padding: 32, maxWidth: 640, margin: '0 auto', position: 'relative' as const }
const winCardStyle = { ...cardStyle, animation: 'winFlash .8s ease-out' }

// ─── FULL SIMULATION ──────────────────────────────────────────────────────────
function FullSimulation({
  abVariant, isForceClassic, isAIAdvisorProminent,
  coins, setCoins, trustScores, setTrustScores, setStats,
  setCapitalProtected, setLegalRisk,
  sessionStart, eventEffect, onRoundComplete, simYear, onAdvanceSimDate,
  scEverUsed, sessionCount,
}: {
  abVariant: string; isForceClassic: boolean; isAIAdvisorProminent: boolean
  coins: number; setCoins: (fn: (c: number) => number) => void
  trustScores: Record<string, number>; setTrustScores: (fn: (s: Record<string, number>) => Record<string, number>) => void
  setStats: (fn: (s: Record<string, number>) => Record<string, number>) => void
  setCapitalProtected: (fn: (c: number) => number) => void
  setLegalRisk: (fn: (r: number) => number) => void
  sessionStart: number; eventEffect: Record<string, number | boolean> | null
  onRoundComplete: () => void; simYear: number; onAdvanceSimDate: (months: number) => void
  scEverUsed: boolean; sessionCount: number
}) {
  const [phase, setPhase] = useState('select_bot')
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null)
  const [hasPlayedClassic, setHasPlayedClassic] = useState(false)
  const [crashActive, setCrashActive] = useState(false)
  const [dominoBump, setDominoBump] = useState(0)
  const [scExecData, setScExecData] = useState<{ params: ContractParams & { effectivePenaltyRate: number }; totalCost: number; actualPrice: number } | null>(null)
  const [contractId, setContractId] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<Record<string, unknown> | null>(null)
  const [autopsy, setAutopsy] = useState<ReturnType<typeof computeAutopsy> | null>(null)
  const [_konkordato, setKonkordato] = useState(false)
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null)
  const [legalMode, setLegalMode] = useState<'lawsuit' | 'arbitration'>('lawsuit')
  const [showConfetti, setShowConfetti] = useState(false)
  const [showLossFlash, setShowLossFlash] = useState(false)
  const [pendingDeliverySuccess, setPendingDeliverySuccess] = useState(false)
  const [execProgress, setExecProgress] = useState(0)
  const execRafRef = useRef<number | null>(null)

  const isMobile = useIsMobile()
  const { isAnimating: coinAnimating, currentDelta: coinDelta, queueAnimation: queueCoinAnim } = useCoinAnimation()

  function triggerWinAnim()  { setShowConfetti(true) }
  function triggerLossAnim() { setShowLossFlash(true); setTimeout(() => setShowLossFlash(false), 1200) }

  useEffect(() => {
    if (!eventEffect) return
    if (eventEffect.crashActive) setCrashActive(true)
    if (eventEffect.dominoBump) setDominoBump(d => Math.min(d + (eventEffect.dominoBump as number), 0.8))
    if (eventEffect.dominoBumpReduce) setDominoBump(d => Math.max(0, d - (eventEffect.dominoBumpReduce as number)))
  }, [eventEffect])

  useEffect(() => {
    if (phase !== 'sc_executing' || !selectedBot) { setExecProgress(0); return }
    const duration = selectedBot.delay * 0.9
    let startTs: number | null = null
    const animate = (ts: number) => {
      if (!startTs) startTs = ts
      const prog = Math.min(((ts - startTs) / duration) * 92, 92)
      setExecProgress(Math.round(prog))
      if (prog < 92) execRafRef.current = requestAnimationFrame(animate)
    }
    execRafRef.current = requestAnimationFrame(animate)
    return () => { if (execRafRef.current) cancelAnimationFrame(execRafRef.current) }
  }, [phase])

  const isMethodLocked = isForceClassic && !hasPlayedClassic

  function handleBotSelect(bot: Bot) {
    track('BOT_SELECT', { botId: bot.id })
    logSimulation({ type: 'bot_selected', botId: bot.id, botName: bot.name, trustScore: trustScores[bot.id] || 50, coins })
    setSelectedBot(bot); setPhase('choose_method')
  }

  function handleMethodChoice(method: 'smart' | 'classic') {
    if (isMethodLocked && method === 'smart') return
    track('METHOD_CHOICE', { chosenMethod: method })
    if (method === 'smart') { setPhase('sc_architect'); return }
    const deliverRate = computeClassicDirectRate(selectedBot!, crashActive, eventEffect as never)
    setPendingDeliverySuccess(Math.random() < deliverRate)
    setPhase('classic_shipping')
  }

  function handleShippingDelivered() {
    const { reward } = computeDynamicReward(selectedBot!, crashActive, eventEffect as never)
    const profit = reward - selectedBot!.basePrice
    setCoins(c => c + profit); queueCoinAnim(profit)
    setTrustScores(s => applyTrustUpdate(s as never, selectedBot!.id, 'classic_success'))
    setDominoBump(d => Math.max(0, d - DOMINO_RECOVERY))
    setCapitalProtected(c => c + selectedBot!.basePrice)
    setStats(s => ({ ...s, wins: (s.wins || 0) + 1, classicUses: (s.classicUses || 0) + 1 }))
    setHasPlayedClassic(true)
    setAutopsy(computeAutopsy('classic', selectedBot!, 0, true))
    setOutcome({ success: true, reward, profit, method: 'classic', yearsSpent: 0, refunded: 0, directDelivery: true, dialogue: pickRandom(selectedBot!.dialogues.success) })
    triggerWinAnim(); setPhase('classic_delivery_confirm')
  }
  function handleShippingFailed() { setPhase('classic_lawyer') }
  function handleDeliveryConfirm() { setPhase('autopsy') }

  function handleSCExecute({ params, totalCost, actualPrice }: { params: ContractParams & { effectivePenaltyRate: number }; evalResult: ReturnType<typeof botEvaluateContract>; totalCost: number; actualPrice: number }) {
    if (coins < totalCost) { alert('Yetersiz bakiye!'); return }
    setCoins(c => c - totalCost); queueCoinAnim(-totalCost)
    const cid = genContractId(); setContractId(cid)
    setScExecData({ params, totalCost, actualPrice })
    setPhase('sc_executing')
    const { reward } = computeDynamicReward(selectedBot!, crashActive, eventEffect as never)
    const successRate = computeSuccessRate(selectedBot!, params, crashActive, dominoBump, eventEffect as never)
    const success = Math.random() < successRate
    setTimeout(() => {
      if (success) {
        setCoins(c => c + reward); queueCoinAnim(+reward)
        setTrustScores(s => applyTrustUpdate(s as never, selectedBot!.id, 'sc_success'))
        setDominoBump(d => Math.max(0, d - DOMINO_RECOVERY))
        setCapitalProtected(c => c + actualPrice)
        setStats(s => ({ ...s, wins: (s.wins || 0) + 1, scUses: (s.scUses || 0) + 1 }))
        setOutcome({ success: true, reward, profit: reward - totalCost, method: 'smart', yearsSpent: 0, refunded: 0, dialogue: pickRandom(selectedBot!.dialogues.success) })
        triggerWinAnim()
        logSimulation({ type: 'round_complete', method: 'smart', won: true, botId: selectedBot!.id, cost: totalCost, reward, profit: reward - totalCost })
      } else {
        setCoins(c => c + actualPrice); queueCoinAnim(+actualPrice)
        setTrustScores(s => applyTrustUpdate(s as never, selectedBot!.id, 'sc_fail'))
        setDominoBump(d => Math.min(d + DOMINO_FAILURE_BUMP, 0.8))
        setStats(s => ({ ...s, losses: (s.losses || 0) + 1, scUses: (s.scUses || 0) + 1 }))
        const oracleFee = params.useOracle ? ORACLE_FEE : 0
        setOutcome({ success: false, reward: 0, profit: -oracleFee, method: 'smart', yearsSpent: 0, refunded: actualPrice, dialogue: pickRandom(selectedBot!.dialogues.fail) })
        triggerLossAnim()
        logSimulation({ type: 'round_complete', method: 'smart', won: false, botId: selectedBot!.id, cost: totalCost })
      }
      setAutopsy(computeAutopsy('smart', selectedBot!, 0, success))
      setPhase('sc_result')
    }, selectedBot!.delay)
  }

  function handleLawyerSelect(lawyer: Lawyer, mode: 'lawsuit' | 'arbitration') {
    const fee = mode === 'lawsuit' ? computeCourtFee(selectedBot!.basePrice) : computeArbitrationFee(selectedBot!.basePrice)
    const totalFee = fee + lawyer.fee
    if (coins < totalFee) { alert('Yetersiz bakiye!'); return }
    setCoins(c => c - totalFee); queueCoinAnim(-totalFee)
    setSelectedLawyer(lawyer); setLegalMode(mode); setHasPlayedClassic(true)
    setStats(s => ({ ...s, classicUses: (s.classicUses || 0) + 1 }))
    setPhase('classic_tunnel')
  }

  function handleTunnelComplete({ won, konkordato: konk, totalYears, isArb, totalInflationCost: inflCost = 0 }: { won: boolean; konkordato: boolean; totalYears: number; isArb: boolean; totalInflationCost: number }) {
    setKonkordato(konk)
    const courtFee = isArb ? computeArbitrationFee(selectedBot!.basePrice) : computeCourtFee(selectedBot!.basePrice)
    const lawyerFee = selectedLawyer?.fee || 0
    if (won) {
      const inflMult = INFLATION_BY_YEAR[totalYears] || 0.2
      const recovered = Math.floor(selectedBot!.basePrice * inflMult * (selectedLawyer?.recoveryRate || 0.5))
      setCoins(c => c + recovered); queueCoinAnim(+recovered)
      setTrustScores(s => applyTrustUpdate(s as never, selectedBot!.id, isArb ? 'arbitration_win' : 'classic_success'))
      setLegalRisk(r => Math.max(0, r - 5))
      setStats(s => ({ ...s, wins: (s.wins || 0) + 1 }))
      setOutcome({ success: true, reward: recovered, profit: recovered - courtFee - lawyerFee, method: 'classic', yearsSpent: totalYears, refunded: 0, inflationCost: inflCost, dialogue: pickRandom(selectedBot!.dialogues.success) })
      triggerWinAnim()
    } else {
      setTrustScores(s => applyTrustUpdate(s as never, selectedBot!.id, 'lawsuit'))
      setLegalRisk(r => Math.min(100, r + 15))
      setDominoBump(d => Math.min(d + DOMINO_FAILURE_BUMP, 0.8))
      setStats(s => ({ ...s, losses: (s.losses || 0) + 1 }))
      setOutcome({ success: false, reward: 0, profit: -(courtFee + lawyerFee), method: 'classic', yearsSpent: totalYears, refunded: 0, inflationCost: inflCost, konkordato: konk, dialogue: pickRandom(selectedBot!.dialogues.fail) })
      triggerLossAnim()
    }
    setAutopsy(computeAutopsy('classic', selectedBot!, totalYears, won))
    setPhase('classic_result')
  }

  function handleAutopsyDone() {
    const yearsSpent = outcome?.yearsSpent as number || 0
    const method = outcome?.method as string || 'smart'
    const monthsToAdvance = method === 'smart' ? 2 : (yearsSpent > 0 ? yearsSpent * 12 : 3)
    onAdvanceSimDate(monthsToAdvance)
    onRoundComplete()
    resetSim()
  }

  function resetSim() {
    setPhase('select_bot'); setSelectedBot(null); setScExecData(null); setContractId(null)
    setOutcome(null); setAutopsy(null); setKonkordato(false); setSelectedLawyer(null)
    setLegalMode('lawsuit'); setShowConfetti(false); setShowLossFlash(false)
    setPendingDeliverySuccess(false); setExecProgress(0)
  }

  const lossCardStyle = { ...cardStyle, animation: showLossFlash ? 'lossFlash .8s ease-out' : undefined }

  if (phase === 'select_bot') return (
    <div style={cardStyle}>
      {coinAnimating && (
        <div style={{ position: 'fixed', top: 80, right: 32, color: coinDelta > 0 ? '#00d4aa' : '#ff4444', fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 20, animation: 'fadeUp .7s ease-out forwards', pointerEvents: 'none', zIndex: 500 }}>
          {coinDelta > 0 ? '+' : ''}{coinDelta} JC
        </div>
      )}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h2 style={{ color: '#e2e8f0', fontSize: 22, marginBottom: 8 }}>Karşı Tarafı Seçin</h2>
        <p style={{ color: '#718096', fontSize: 13 }}>Kim ile anlaşma yapacaksınız?</p>
        {abVariant === 'forceClassicFirst' && <div style={{ marginTop: 10, background: 'rgba(255,107,53,.08)', border: '1px solid rgba(255,107,53,.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#f6ad55' }}>Önce klasik yöntemi deneyin.</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {BOTS.map(bot => <BotCard key={bot.id} bot={bot} trustScore={trustScores[bot.id] || 50} selected={false} onSelect={handleBotSelect} simYear={simYear} />)}
      </div>
    </div>
  )

  if (phase === 'choose_method' && selectedBot) {
    const isAiVariant = isAIAdvisorProminent
    const classicDeliverRate = computeClassicDirectRate(selectedBot, crashActive, eventEffect as never)
    return (
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <span style={{ fontSize: 40 }}>{selectedBot.emoji}</span>
          <h2 style={{ color: '#e2e8f0', fontSize: 20, marginTop: 8, marginBottom: 4 }}>{selectedBot.name}</h2>
          <div style={{ color: '#a0aec0', fontSize: 12, marginBottom: 4, fontFamily: "'Space Mono',monospace" }}>{selectedBot.contractType} · {selectedBot.contractRef}</div>
          <div style={{ color: '#718096', fontSize: 13, fontStyle: 'italic' }}>"{pickRandom(selectedBot.dialogues.greet)}"</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
          <button onClick={() => handleMethodChoice('classic')} style={{ padding: '20px 16px', border: '2px solid rgba(255,107,53,.3)', borderRadius: 14, cursor: 'pointer', background: 'rgba(255,107,53,.06)', color: '#e2e8f0', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, transition: 'all .2s' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⚖️</div>
            <div>Klasik Sözleşme</div>
            <div style={{ color: '#718096', fontSize: 12, marginTop: 6, fontWeight: 400 }}>Geleneksel yol</div>
            <div style={{ marginTop: 8, color: '#f39c12', fontSize: 11 }}>Doğrudan teslimat: %{Math.round(classicDeliverRate * 100)}</div>
          </button>
          <button disabled={isMethodLocked} onClick={() => handleMethodChoice('smart')} style={{ padding: '20px 16px', border: `2px solid ${isMethodLocked ? 'rgba(255,255,255,.06)' : 'rgba(0,212,170,.4)'}`, borderRadius: 14, cursor: isMethodLocked ? 'not-allowed' : 'pointer', opacity: isMethodLocked ? 0.4 : 1, background: isMethodLocked ? 'transparent' : 'rgba(0,212,170,.08)', color: isMethodLocked ? '#4a5568' : '#e2e8f0', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, transition: 'all .2s', boxShadow: !isMethodLocked && isAiVariant ? '0 0 30px rgba(0,212,170,.3)' : 'none' }}>
            {isAiVariant && !isMethodLocked && <div style={{ fontSize: 10, color: '#00d4aa', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>✦ ÖNERİLEN</div>}
            <div style={{ fontSize: 28, marginBottom: 8 }}>⚡</div>
            <div>Smart Contract</div>
            <div style={{ color: isMethodLocked ? '#2d3748' : '#718096', fontSize: 12, marginTop: 6, fontWeight: 400 }}>Otomatik icra</div>
          </button>
        </div>
        <button onClick={() => setPhase('select_bot')} style={{ marginTop: 16, padding: '8px 20px', background: 'transparent', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 13 }}>← Bot Değiştir</button>
      </div>
    )
  }

  if (phase === 'sc_architect' && selectedBot) return (
    <div style={cardStyle}>
      <ContractBuilder
        bot={selectedBot}
        trustScore={trustScores[selectedBot.id] || 50}
        dominoBump={dominoBump}
        crashActive={crashActive}
        eventEffect={eventEffect as never}
        legalTerms={LEGAL_TERMS}
        simYear={simYear}
        onExecute={handleSCExecute}
        onBack={() => setPhase('choose_method')}
      />
    </div>
  )

  if (phase === 'sc_executing') return (
    <div style={{ ...cardStyle, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 16, animation: 'float 2s ease-in-out infinite' }}>⛓️</div>
      <div style={{ color: '#00d4aa', fontFamily: "'Space Mono',monospace", fontSize: 13, marginBottom: 8, letterSpacing: 2 }}>KONTRAT KİLİTLENİYOR</div>
      <div style={{ height: 6, background: 'rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden', margin: '12px 0' }}>
        <div style={{ height: '100%', width: `${execProgress}%`, background: 'linear-gradient(90deg,#00d4aa,#0099ff)', borderRadius: 3, transition: 'width .04s linear' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4a5568', marginBottom: 16 }}>
        <span>{execProgress < 30 ? 'İmza doğrulanıyor…' : execProgress < 60 ? 'Blok onayı bekleniyor…' : execProgress < 85 ? 'Oracle verisi çekiliyor…' : 'Sözleşme aktif hale geliyor…'}</span>
        <span style={{ fontFamily: "'Space Mono',monospace", color: '#00d4aa' }}>{execProgress}%</span>
      </div>
      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#2d3748' }}>{contractId}</div>
    </div>
  )

  if (phase === 'classic_shipping' && selectedBot) return (
    <div style={cardStyle}>
      <DeliveryShipping bot={selectedBot} deliveryTimeMult={(eventEffect?.deliveryTimeMult as number) || 1} willSucceed={pendingDeliverySuccess} onDelivered={handleShippingDelivered} onFailed={handleShippingFailed} />
    </div>
  )

  if (phase === 'classic_delivery_confirm' && outcome && selectedBot) return (
    <div style={winCardStyle}>
      {showConfetti && <ConfettiOverlay onDone={() => setShowConfetti(false)} />}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 52 }}>✅</div>
        <h3 style={{ color: '#00d4aa', fontSize: 22, marginTop: 8, marginBottom: 4 }}>Teslimat Onaylandı</h3>
        <p style={{ color: '#718096', fontSize: 13 }}>{selectedBot.name} karşılıklı yükümlülüğünü yerine getirdi.</p>
      </div>
      <LegalReceipt
        title="İKİLİ TİCARET — BAŞARILI TESLİMAT" color="#00d4aa"
        entries={[
          { label: 'Ödenen', value: `${selectedBot.basePrice} JC`, accent: '#718096' },
          { label: 'Alınan', value: `${outcome.reward} JC`, accent: '#00d4aa', bold: true },
          { label: 'Mahkeme harcı', value: '0 JC', accent: '#00d4aa' },
          { label: 'Teslimat', value: 'Onaylandı ✅', accent: '#00d4aa' },
        ]}
        total={`+${outcome.profit} JC`}
      />
      <button onClick={handleDeliveryConfirm} style={{ width: '100%', marginTop: 16, padding: '14px 0', background: 'linear-gradient(135deg,#00d4aa,#0099ff)', border: 'none', borderRadius: 10, color: '#060a10', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Ekonomik Analizi Gör →</button>
    </div>
  )

  if (phase === 'classic_lawyer' && selectedBot) return (
    <div style={cardStyle}>
      <div style={{ background: 'rgba(255,107,53,.08)', border: '1px solid rgba(255,107,53,.2)', borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 13, color: '#f6ad55' }}>
        <strong>{selectedBot.emoji} {selectedBot.name}:</strong> "{pickRandom(selectedBot.dialogues.fail)}"
      </div>
      <LawyerSelect bot={selectedBot} legalTerms={LEGAL_TERMS} onSelect={handleLawyerSelect} simYear={simYear} />
    </div>
  )

  if (phase === 'classic_tunnel' && selectedBot && selectedLawyer) {
    const isArb = legalMode === 'arbitration'
    return <div style={cardStyle}><TimeTunnel bot={selectedBot} lawyer={selectedLawyer} isArb={isArb} onComplete={handleTunnelComplete} /></div>
  }

  if (phase === 'sc_result' && outcome && selectedBot) {
    const totalCost = scExecData?.totalCost || 0
    const cardS = (outcome.success as boolean) ? winCardStyle : { ...lossCardStyle, animation: showLossFlash ? 'lossFlash .8s ease-out' : undefined }
    return (
      <div style={cardS}>
        {showConfetti && <ConfettiOverlay onDone={() => setShowConfetti(false)} />}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 52 }}>{(outcome.success as boolean) ? '✅' : '🔄'}</div>
          <h3 style={{ color: (outcome.success as boolean) ? '#00d4aa' : '#f39c12', fontSize: 22, marginTop: 8, marginBottom: 4 }}>{(outcome.success as boolean) ? 'Teslimat Başarılı' : 'Otomatik İade'}</h3>
          {!(outcome.success as boolean) && (
            <div style={{ background: 'rgba(0,212,170,.08)', border: '1px solid rgba(0,212,170,.2)', borderRadius: 10, padding: 12, marginTop: 12, animation: 'refundPop .5s ease-out' }}>
              <div style={{ color: '#00d4aa', fontWeight: 700, fontSize: 16 }}>🔒 Paran Güvende</div>
              <div style={{ color: '#68d391', fontSize: 13, marginTop: 4 }}>{outcome.refunded as number} JC anında iade edildi</div>
            </div>
          )}
        </div>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#4a5568', textAlign: 'center', marginBottom: 16 }}>{contractId}</div>
        <LegalReceipt
          title="SMART CONTRACT ÖZETI" color="#00d4aa"
          entries={[
            { label: 'Ödenen', value: `${totalCost} JC` },
            (outcome.success as boolean)
              ? { label: 'Kazanılan', value: `${outcome.reward} JC`, accent: '#00d4aa', bold: true }
              : { label: 'İade', value: `${outcome.refunded} JC`, accent: '#00d4aa', bold: true },
            { label: 'Net', value: `${(outcome.profit as number) >= 0 ? '+' : ''}${outcome.profit} JC`, accent: (outcome.profit as number) >= 0 ? '#00d4aa' : '#ff6b35', bold: true },
          ]}
          total={`${(outcome.profit as number) >= 0 ? '+' : ''}${outcome.profit} JC`}
        />
        <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
          <span style={{ fontSize: 20 }}>{selectedBot.emoji}</span>
          <span style={{ color: '#a0aec0', fontSize: 13, marginLeft: 8, fontStyle: 'italic' }}>"{outcome.dialogue as string}"</span>
        </div>
        <button onClick={() => setPhase('autopsy')} style={{ width: '100%', marginTop: 16, padding: '14px 0', background: 'linear-gradient(135deg,#00d4aa,#0099ff)', border: 'none', borderRadius: 10, color: '#060a10', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Ekonomik Analizi Gör →</button>
      </div>
    )
  }

  if (phase === 'classic_result' && outcome && selectedBot) {
    const courtFee = legalMode === 'lawsuit' ? computeCourtFee(selectedBot.basePrice) : computeArbitrationFee(selectedBot.basePrice)
    const lawyerFee = selectedLawyer?.fee || 0
    const cardS = (outcome.success as boolean) ? winCardStyle : { ...lossCardStyle, animation: outcome.konkordato ? 'konkordatoFlash 1s ease-in-out 3' : showLossFlash ? 'lossFlash .8s ease-out' : undefined }
    return (
      <div style={cardS}>
        {showConfetti && <ConfettiOverlay onDone={() => setShowConfetti(false)} />}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 52 }}>{(outcome.success as boolean) ? '🏆' : (outcome.konkordato as boolean) ? '💀' : '😔'}</div>
          <h3 style={{ color: (outcome.success as boolean) ? '#00d4aa' : (outcome.konkordato as boolean) ? '#ff4444' : '#f39c12', fontSize: 22, marginTop: 8, marginBottom: 4 }}>
            {(outcome.success as boolean) ? 'Dava Kazanıldı' : (outcome.konkordato as boolean) ? 'Konkordato İlan Edildi' : 'Dava Kaybedildi'}
          </h3>
          <p style={{ color: '#718096', fontSize: 13 }}>{outcome.yearsSpent as number} yıl sürdü</p>
        </div>
        <LegalReceipt title="KLASİK YÖNTEM MALİYETİ" color="#ff6b35"
          entries={[
            { label: 'Mahkeme / Tahkim Harcı', value: `${courtFee} JC`, accent: '#ff6b35' },
            { label: 'Avukat Ücreti', value: `${lawyerFee} JC`, accent: '#ff6b35' },
            { label: 'Süre', value: `${outcome.yearsSpent} yıl` },
            (outcome.success as boolean)
              ? { label: 'Tahsil edilen', value: `${outcome.reward} JC`, accent: '#00d4aa', bold: true }
              : { label: 'Tahsil edilen', value: '0 JC', accent: '#ff4444' },
            { label: 'Enflasyon kaybı (değer)', value: `-${autopsy?.inflationLoss || 0} JC`, accent: '#ff4444' },
            ...((outcome.inflationCost as number) > 0 ? [{ label: '📈 Ücret artışı (enflasyon)', value: `+${outcome.inflationCost} JC`, accent: '#f6ad55' }] : []),
          ]}
          total={`${(outcome.profit as number) >= 0 ? '+' : ''}${outcome.profit} JC`}
        />
        <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
          <span style={{ fontSize: 20 }}>{selectedBot.emoji}</span>
          <span style={{ color: '#a0aec0', fontSize: 13, marginLeft: 8, fontStyle: 'italic' }}>"{outcome.dialogue as string}"</span>
        </div>
        <button onClick={() => setPhase('autopsy')} style={{ width: '100%', marginTop: 16, padding: '14px 0', background: 'linear-gradient(135deg,#ff6b35,#ff4444)', border: 'none', borderRadius: 10, color: '#fff', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Smart Contract ile Karşılaştır →</button>
      </div>
    )
  }

  if (phase === 'autopsy' && autopsy && selectedBot) return (
    <div style={cardStyle}>
      <EconomicAutopsy
        autopsy={autopsy}
        method={(outcome?.method as 'smart' | 'classic' | 'arbitration') || 'classic'}
        sessionDurationMs={Date.now() - sessionStart}
        onDone={handleAutopsyDone}
        scEverUsed={scEverUsed}
        sessionCount={sessionCount}
      />
    </div>
  )

  return null
}

// ─── COMPARISON TOOL ─────────────────────────────────────────────────────────
function ComparisonTool({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState({ contractValue: 50000, counterpartyRisk: 'orta', durationMonths: 12, jurisdiction: 'turkey' })
  const [result, setResult] = useState<Record<string, number> | null>(null)

  function compute() {
    track('CTA_CLICK', { ctaType: 'comparison_tool_compute' })
    const val = form.contractValue
    const intlExtra = form.jurisdiction === 'international' ? 1.8 : 1
    const avgYears = form.jurisdiction === 'international' ? 4.8 : 3.2
    const years = Math.max(avgYears, 1)
    const winRate = ({ dusuk: 0.72, orta: 0.58, yuksek: 0.38 } as Record<string, number>)[form.counterpartyRisk] || 0.58
    const failChance = 1 - winRate
    const classicCourtFee = Math.round(Math.max(val * 0.069, 500))
    const aaütRate = val <= 200000 ? 0.15 : val <= 1000000 ? 0.10 : val <= 5000000 ? 0.07 : 0.05
    const classicLawyerFee = Math.round(val * aaütRate * intlExtra)
    const inflMult = INFLATION_BY_YEAR[Math.min(Math.ceil(years), 10)] || 0.28
    const classicInflLoss = Math.floor(val * (1 - inflMult))
    const annualRate = Math.max(0.40 - (years - 1) * 0.025, 0.22)
    const classicOppCost = Math.floor(val * (Math.pow(1 + annualRate, years) - 1))
    const classicKonkRisk = Math.round(failChance * 0.11 * 100)
    const classicTotalRisk = classicCourtFee + classicLawyerFee + classicInflLoss + classicOppCost
    const scOracleFee = form.jurisdiction === 'international' ? 60 : 30
    const scTotalRisk = Math.round(val * failChance * 0.05) + scOracleFee
    setResult({ val, years, winRate, classicCourtFee, classicLawyerFee, classicInflLoss, classicOppCost, classicKonkRisk, classicTotalRisk, scOracleFee, scTotalRisk, savings: Math.max(classicTotalRisk - scTotalRisk, 0), annualRatePct: Math.round(annualRate * 100) })
  }

  const f = (n: number) => n.toLocaleString('tr-TR')
  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ color: '#9b59b6', fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>KARŞILAŞTIRMA ARACI</div>
        <h2 style={{ color: '#e2e8f0', fontSize: 26, marginBottom: 8 }}>Risk Analizi Hesaplayıcı</h2>
        <p style={{ color: '#718096', fontSize: 14 }}>Sözleşme parametrelerini girin, SC avantajını görün.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div><label style={{ color: '#a0aec0', fontSize: 13, display: 'block', marginBottom: 8 }}>Sözleşme Bedeli (TL)</label><input type="number" value={form.contractValue} onChange={e => setForm(f => ({ ...f, contractValue: Number(e.target.value) }))} style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontFamily: "'Space Mono',monospace", fontSize: 14, outline: 'none' }} /></div>
        <div><label style={{ color: '#a0aec0', fontSize: 13, display: 'block', marginBottom: 8 }}>Süre (Ay)</label><input type="number" value={form.durationMonths} onChange={e => setForm(f => ({ ...f, durationMonths: Number(e.target.value) }))} style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontFamily: "'Space Mono',monospace", fontSize: 14, outline: 'none' }} /></div>
        <div><label style={{ color: '#a0aec0', fontSize: 13, display: 'block', marginBottom: 8 }}>Karşı Taraf Riski</label><select value={form.counterpartyRisk} onChange={e => setForm(f => ({ ...f, counterpartyRisk: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontFamily: "'Syne',sans-serif", fontSize: 14, outline: 'none' }}><option value="dusuk">Düşük</option><option value="orta">Orta</option><option value="yuksek">Yüksek</option></select></div>
        <div><label style={{ color: '#a0aec0', fontSize: 13, display: 'block', marginBottom: 8 }}>Yetki Alanı</label><select value={form.jurisdiction} onChange={e => setForm(f => ({ ...f, jurisdiction: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontFamily: "'Syne',sans-serif", fontSize: 14, outline: 'none' }}><option value="turkey">Türkiye</option><option value="international">Uluslararası</option></select></div>
      </div>
      <button onClick={compute} style={{ width: '100%', padding: '14px 0', background: 'linear-gradient(135deg,#9b59b6,#8e44ad)', border: 'none', borderRadius: 10, color: '#fff', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer', marginBottom: 24 }}>Risk Analizi Hesapla →</button>
      {result && (
        <div style={{ animation: 'countUp .4s ease-out' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={{ background: 'rgba(255,68,68,.08)', border: '1px solid rgba(255,68,68,.3)', borderRadius: 12, padding: 20 }}>
              <div style={{ color: '#ff4444', fontWeight: 700, marginBottom: 12 }}>⚖️ Klasik Yöntem Riski</div>
              <div style={{ fontSize: 13, color: '#718096', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>Mahkeme harcı: <strong style={{ color: '#e2e8f0' }}>{f(result.classicCourtFee)} TL</strong></div>
                <div>Avukat ücreti: <strong style={{ color: '#e2e8f0' }}>{f(result.classicLawyerFee)} TL</strong></div>
                <div>Enflasyon kaybı: <strong style={{ color: '#ff6b35' }}>{f(result.classicInflLoss)} TL</strong></div>
                <div>Fırsat maliyeti (%{result.annualRatePct}/yıl): <strong style={{ color: '#ff6b35' }}>{f(result.classicOppCost)} TL</strong></div>
                <div>Konkordato riski: <strong style={{ color: '#f39c12' }}>%{result.classicKonkRisk}</strong></div>
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,68,68,.2)' }}>
                <div style={{ color: '#718096', fontSize: 11 }}>TOPLAM RİSK</div>
                <div style={{ color: '#ff4444', fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 20 }}>{f(result.classicTotalRisk)} TL</div>
              </div>
            </div>
            <div style={{ background: 'rgba(0,212,170,.08)', border: '1px solid rgba(0,212,170,.3)', borderRadius: 12, padding: 20 }}>
              <div style={{ color: '#00d4aa', fontWeight: 700, marginBottom: 16 }}>⚡ Smart Contract Riski</div>
              <div style={{ fontSize: 13, color: '#718096', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>Oracle ücreti: <strong style={{ color: '#e2e8f0' }}>{f(result.scOracleFee)} TL</strong></div>
                <div>Mahkeme harcı: <strong style={{ color: '#00d4aa' }}>0 TL</strong></div>
                <div>Bekleme süresi: <strong style={{ color: '#00d4aa' }}>0 yıl</strong></div>
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,212,170,.2)' }}>
                <div style={{ color: '#718096', fontSize: 11 }}>TOPLAM RİSK</div>
                <div style={{ color: '#00d4aa', fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 20 }}>{f(result.scTotalRisk)} TL</div>
              </div>
            </div>
          </div>
          <div style={{ background: 'rgba(0,212,170,.06)', border: '1px solid rgba(0,212,170,.2)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ color: '#00d4aa', fontWeight: 700, fontSize: 20, marginBottom: 4 }}>Smart Contract ile {f(result.savings)} TL tasarruf potansiyeli</div>
            <div style={{ color: '#718096', fontSize: 13 }}>Bu analiz simülasyon amaçlıdır. Hukuki tavsiye niteliği taşımaz.</div>
          </div>
        </div>
      )}
      <button onClick={onBack} style={{ marginTop: 16, padding: '10px 24px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: '#a0aec0', fontFamily: "'Syne',sans-serif", fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>← Geri</button>
    </div>
  )
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export function App() {
  const ab = useABVariant()
  const abVariant = ab.variant
  const sessionStart = useRef(Date.now()).current
  const game = useGameState()

  const [activeModule, setActiveModule] = useState<'full_simulation' | 'comparison_tool'>('full_simulation')
  const insolvencyHandledRef = useRef(false)
  const nextEventAtRef = useRef(2 + Math.floor(Math.random() * 2))
  const loanTriggerRef = useRef(LOAN_TRIGGER_EVERY)

  // Insolvency check
  useEffect(() => {
    if (game.coins > 0 && game.coins < BANKRUPTCY_THRESHOLD && !game.showInsolvency && !insolvencyHandledRef.current) {
      game.setShowInsolvency(true)
      insolvencyHandledRef.current = true
      track('INSOLVENCY', { coinsAtTrigger: game.coins })
    }
    if (game.coins >= BANKRUPTCY_THRESHOLD) { insolvencyHandledRef.current = false }
  }, [game.coins])

  useEffect(() => {
    track('SESSION_START', { timestamp: Date.now(), abVariant: ab.variant })
    const h = () => track('EXIT_INTENT', { sessionDurationMs: Date.now() - sessionStart })
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [])

  function handleConcordato() {
    const loss = Math.floor(game.coins * 0.30)
    const newCoins = Math.max(game.coins - loss, BANKRUPTCY_THRESHOLD + 50)
    game.setCoins(newCoins)
    game.updateStats({ concordatos: (game.stats.concordatos || 0) + 1 })
    game.setShowInsolvency(false)
    track('CONCORDATO', { coinsLost: loss, coinsRemaining: newCoins })
  }

  function handleBankruptcy() {
    game.resetAll()
    insolvencyHandledRef.current = false
    track('BANKRUPTCY', { coinsAtBankruptcy: game.coins })
  }

  function handleRoundComplete() {
    const newCount = game.contractCount + 1
    game.incrementContractCount()
    if (newCount >= nextEventAtRef.current) {
      const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)]
      game.setActiveEvent(event)
      nextEventAtRef.current = newCount + 2 + Math.floor(Math.random() * 2)
    }
    if (newCount >= loanTriggerRef.current && !game.pendingLoanRequest) {
      const bot = BOTS[Math.floor(Math.random() * BOTS.length)]
      if (game.coins > bot.loanAmount * 1.5) {
        game.setPendingLoanRequest(bot)
        loanTriggerRef.current = newCount + LOAN_TRIGGER_EVERY + Math.floor(Math.random() * 3)
      }
    }
  }

  function handleEventDismiss() {
    if (!game.activeEvent) return
    const eff = game.activeEvent.effect
    game.setEventEffect(eff)
    if (eff?.coinBonus) game.setCoins(game.coins + eff.coinBonus)
    game.setActiveEvent(null)
    track('RANDOM_EVENT', { eventId: game.activeEvent.id, type: game.activeEvent.type })
  }

  function handleLend(amount: number, interest: number) {
    game.setCoins(game.coins - amount)
    game.setActiveLoan({ bot: game.pendingLoanRequest!, amount, interest })
    game.setPendingLoanRequest(null)
    game.setLoanState('lending')
    track('LOAN_GIVEN', { botId: game.pendingLoanRequest?.id, amount })
    const willRepay = Math.random() < game.pendingLoanRequest!.loanRepayRate
    setTimeout(() => {
      if (willRepay) {
        game.setCoins(game.coins + amount + interest)
        game.setLoanState('repaid' as never)
      } else {
        game.setLoanState('defaulted')
      }
    }, 2000)
  }

  function handleLoanRefuse() {
    track('LOAN_REFUSED', { botId: game.pendingLoanRequest?.id })
    game.setPendingLoanRequest(null)
  }

  function handleMiniLawsuitComplete({ won, recover, courtFee }: { won: boolean; recover: number; courtFee: number }) {
    if (won) game.setCoins(game.coins + recover - courtFee)
    else game.setCoins(game.coins - courtFee)
    game.setShowMiniLawsuit(false)
    game.setLoanState(null)
    game.setActiveLoan(null)
  }

  function advanceSimDate(months: number) {
    const total = game.simDate.year * 12 + game.simDate.month + months
    game.setSimDate({ year: Math.floor(total / 12), month: total % 12 })
  }

  const playerReputation = computePlayerReputation(game.trustScores)
  const MODULES = [
    { id: 'full_simulation', label: 'Tam Simülasyon', emoji: '🎮', desc: '3-5 dk' },
    { id: 'comparison_tool', label: 'Karşılaştır', emoji: '📊', desc: '2 dk' },
  ]

  const reputationBadge = getReputationBadge(playerReputation)

  return (
    <ErrorBoundary>
      <div style={{ minHeight: '100vh', background: '#060a10', color: '#e2e8f0' }}>

        {/* Consent banner */}
        {game.showConsent && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,10,16,.92)', backdropFilter: 'blur(6px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: '#0d1421', border: '1px solid rgba(0,212,170,.25)', borderRadius: 20, padding: '40px 36px', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,.6)' }}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>⚖️</div>
              <h2 style={{ color: '#e2e8f0', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 14, lineHeight: 1.3 }}>JusDigitalis Smart Contract Sandbox</h2>
              <p style={{ color: '#a0aec0', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>Bu simülasyon eğitim amaçlıdır. Tüm veriler anonimdir — kişisel bilgi toplanmaz.</p>
              <button
                onClick={() => { try { localStorage.setItem('jd_consent_given', '1') } catch {} game.setShowConsent(false) }}
                style={{ width: '100%', padding: '14px 0', border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#00d4aa,#0099ff)', color: '#060a10', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer', letterSpacing: 0.4 }}
              >
                Simülasyonu Başlat →
              </button>
              <p style={{ color: '#4a5568', fontSize: 11, marginTop: 20 }}>© JusDigitalis — Hukuk Mühendisliği</p>
            </div>
          </div>
        )}

        {/* Insolvency modal */}
        {game.showInsolvency && <BankruptcyModal coins={game.coins} onConcordato={handleConcordato} onBankruptcy={handleBankruptcy} />}

        {/* Loan request modal */}
        {game.pendingLoanRequest && !game.showInsolvency && (
          <LoanModal request={{ bot: game.pendingLoanRequest, amount: game.pendingLoanRequest.loanAmount, repayRate: game.pendingLoanRequest.loanRepayRate }} coins={game.coins} onLend={handleLend} onRefuse={handleLoanRefuse} />
        )}

        {/* Loan repaid toast */}
        {game.loanState === 'repaid' && game.activeLoan && (
          <div style={{ position: 'fixed', bottom: 32, right: 32, background: 'rgba(0,212,170,.15)', border: '2px solid rgba(0,212,170,.4)', borderRadius: 16, padding: '16px 22px', zIndex: 600, maxWidth: 320, animation: 'loanIn .4s ease-out' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 24 }}>{game.activeLoan.bot.emoji}</span>
              <div>
                <div style={{ color: '#00d4aa', fontWeight: 700, fontSize: 14 }}>{game.activeLoan.bot.name} geri ödedi!</div>
                <div style={{ color: '#68d391', fontSize: 13 }}>+{game.activeLoan.amount + game.activeLoan.interest} JC (faizli)</div>
              </div>
            </div>
            <p style={{ color: '#718096', fontSize: 12, fontStyle: 'italic' }}>"{pickRandom(game.activeLoan.bot.dialogues.loanRepay)}"</p>
            <button onClick={() => { game.setLoanState(null); game.setActiveLoan(null) }} style={{ marginTop: 10, width: '100%', padding: '8px 0', background: 'rgba(0,212,170,.2)', border: '1px solid rgba(0,212,170,.4)', borderRadius: 8, color: '#00d4aa', fontFamily: "'Syne',sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Tamam</button>
          </div>
        )}

        {/* Loan default toast */}
        {game.loanState === 'defaulted' && game.activeLoan && !game.showMiniLawsuit && (
          <div style={{ position: 'fixed', bottom: 32, right: 32, background: 'rgba(255,68,68,.1)', border: '2px solid rgba(255,68,68,.35)', borderRadius: 16, padding: '16px 22px', zIndex: 600, maxWidth: 340, animation: 'loanIn .4s ease-out' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 24 }}>{game.activeLoan.bot.emoji}</span>
              <div>
                <div style={{ color: '#ff4444', fontWeight: 700, fontSize: 14 }}>{game.activeLoan.bot.name} ödeme yapmadı!</div>
                <div style={{ color: '#fc8181', fontSize: 13 }}>{game.activeLoan.amount} JC geri gelmedi</div>
              </div>
            </div>
            <p style={{ color: '#718096', fontSize: 12, fontStyle: 'italic', marginBottom: 12 }}>"{pickRandom(game.activeLoan.bot.dialogues.loanDefault)}"</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => { game.setLoanState(null); game.setActiveLoan(null) }} style={{ padding: '8px 0', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, color: '#a0aec0', fontFamily: "'Syne',sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Vazgeç</button>
              <button onClick={() => game.setShowMiniLawsuit(true)} style={{ padding: '8px 0', background: 'rgba(255,107,53,.2)', border: '1px solid rgba(255,107,53,.4)', borderRadius: 8, color: '#f6ad55', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Dava Aç ⚖️</button>
            </div>
          </div>
        )}

        {/* Mini lawsuit */}
        {game.showMiniLawsuit && game.activeLoan && (
          <MiniLawsuit bot={game.activeLoan.bot} loanAmount={game.activeLoan.amount} onComplete={handleMiniLawsuitComplete} />
        )}

        {/* Market event modal */}
        {game.activeEvent && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: '#0d1b2a', border: `2px solid ${game.activeEvent.type === 'positive' ? 'rgba(0,212,170,.5)' : 'rgba(255,68,68,.5)'}`, borderRadius: 20, padding: 36, maxWidth: 480, width: '100%', textAlign: 'center', animation: 'eventIn .4s ease-out' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>{game.activeEvent.emoji}</div>
              <div style={{ color: game.activeEvent.type === 'positive' ? '#00d4aa' : '#ff4444', fontSize: 11, letterSpacing: 2, marginBottom: 10, fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{game.activeEvent.type === 'positive' ? '✦ POZİTİF OLAY' : '⚠️ NEGATİF OLAY'}</div>
              <h3 style={{ color: '#e2e8f0', fontSize: 24, marginBottom: 12 }}>{game.activeEvent.title}</h3>
              <p style={{ color: '#a0aec0', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>{game.activeEvent.description}</p>
              <button onClick={handleEventDismiss} style={{ padding: '14px 48px', background: game.activeEvent.type === 'positive' ? 'linear-gradient(135deg,#00d4aa,#0099ff)' : 'linear-gradient(135deg,#ff4444,#ff6b35)', border: 'none', borderRadius: 12, color: '#fff', fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Devam Et →</button>
            </div>
          </div>
        )}

        {/* Active event banner */}
        {game.eventEffect && !game.activeEvent && (
          <div style={{ background: game.eventEffect.rewardBonus || game.eventEffect.successBonus ? 'rgba(0,212,170,.08)' : 'rgba(255,68,68,.08)', borderBottom: `1px solid ${game.eventEffect.rewardBonus || game.eventEffect.successBonus ? 'rgba(0,212,170,.2)' : 'rgba(255,68,68,.2)'}`, padding: '8px 24px', textAlign: 'center', fontSize: 12, color: game.eventEffect.rewardBonus || game.eventEffect.successBonus ? '#68d391' : '#fc8181' }}>
            {game.eventEffect.rewardBonus && `✦ Aktif: Sermaye Akışı — ödüller +%${Math.round((game.eventEffect.rewardBonus as number) * 100)}`}
            {game.eventEffect.crashActive && '⚠️ Aktif: Pandemi Şoku — piyasa krizi devam ediyor'}
            {game.eventEffect.rewardPenalty && ` ⚠️ Döviz Krizi — ödüller -%${Math.round((game.eventEffect.rewardPenalty as number) * 100)}`}
          </div>
        )}

        {/* Header */}
        <Header coins={game.coins} reputation={playerReputation} simDate={game.simDate} />

        {/* Nav */}
        <nav style={{ borderBottom: '1px solid rgba(255,255,255,.06)', padding: '0 24px', display: 'flex', gap: 4, overflowX: 'auto' }}>
          {MODULES.map(m => (
            <button key={m.id} onClick={() => setActiveModule(m.id as never)} style={{ padding: '14px 20px', border: 'none', background: 'transparent', cursor: 'pointer', color: activeModule === m.id ? '#00d4aa' : '#718096', fontFamily: "'Syne',sans-serif", fontWeight: 600, fontSize: 13, borderBottom: `2px solid ${activeModule === m.id ? '#00d4aa' : 'transparent'}`, transition: 'all .2s', display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}>
              <span>{m.emoji}</span>{m.label}
              <span style={{ color: '#4a5568', fontSize: 11, fontWeight: 400 }}>{m.desc}</span>
            </button>
          ))}
        </nav>

        {/* Main */}
        <main style={{ padding: '32px 24px', maxWidth: 760, margin: '0 auto' }}>
          {(game.stats.wins + game.stats.losses) > 0 && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Kazanılan', value: game.stats.wins, color: '#00d4aa' },
                { label: 'Kaybedilen', value: game.stats.losses, color: '#ff4444' },
                { label: 'SC Kullanımı', value: game.stats.scUses, color: '#0099ff' },
                { label: 'Korunan Sermaye', value: `${game.capitalProtected} JC`, color: '#9b59b6' },
                { label: 'İtibar Puanı', value: `${playerReputation}/100`, color: reputationBadge.color },
                ...(game.stats.concordatos > 0 ? [{ label: 'Konkordato', value: game.stats.concordatos, color: '#f39c12' }] : []),
              ].map((s, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 10, padding: '10px 16px' }}>
                  <div style={{ color: s.color, fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 16 }}>{s.value}</div>
                  <div style={{ color: '#4a5568', fontSize: 11 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {activeModule === 'full_simulation' && (
            <FullSimulation
              abVariant={abVariant}
              isForceClassic={ab.isForceClassic}
              isAIAdvisorProminent={ab.isAIAdvisorProminent}
              coins={game.coins}
              setCoins={fn => game.setCoins(fn(game.coins))}
              trustScores={game.trustScores}
              setTrustScores={fn => { const next = fn(game.trustScores as Record<string, number>); Object.keys(next).forEach(k => { if (next[k] !== (game.trustScores as Record<string, number>)[k]) game.applyTrust(k, 'sc_success') }); }}
              setStats={fn => game.updateStats(fn(game.stats as never) as never)}
              setCapitalProtected={fn => game.addCapitalProtected(fn(game.capitalProtected) - game.capitalProtected)}
              setLegalRisk={fn => game.addLegalRisk(fn(game.legalRisk) - game.legalRisk)}
              sessionStart={sessionStart}
              eventEffect={game.eventEffect as never}
              onRoundComplete={handleRoundComplete}
              simYear={game.simDate.year}
              onAdvanceSimDate={advanceSimDate}
              scEverUsed={game.stats.scUses > 0}
              sessionCount={game.sessionCount}
            />
          )}

          {activeModule === 'comparison_tool' && (
            <ComparisonTool onBack={() => setActiveModule('full_simulation')} />
          )}

          <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            {Object.entries(LEGAL_TERMS).map(([k]) => (
              <LegalTermTooltip key={k} termKey={k} legalTerms={LEGAL_TERMS} />
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 24, color: '#2d3748', fontSize: 11, fontFamily: "'Space Mono',monospace" }}>
            JUS DIGITALIS v2.7.3a — Simülasyon amaçlıdır. Hukuki tavsiye niteliği taşımaz.
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
