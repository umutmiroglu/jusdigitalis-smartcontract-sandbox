import { useState, useCallback, useEffect } from 'react'
import type { Bot, Lawyer, ContractParams, GameStats, TrustScores, RandomEvent, EventEffect } from '../types'
import { INITIAL_COINS, DOMINO_RECOVERY, LAWSUIT_START_YEAR, LAWSUIT_START_MONTH } from '../constants/game'
import { initTrustScores, applyTrustUpdate } from '../utils/trust'
import { loadPersisted, savePersisted } from '../utils/persistence'
import { track } from '../utils/analytics'

type GamePhase =
  | 'select_bot'
  | 'choose_method'
  | 'sc_architect'
  | 'sc_executing'
  | 'sc_result'
  | 'classic_shipping'
  | 'classic_delivery_confirm'
  | 'classic_lawyer'
  | 'classic_tunnel'
  | 'classic_result'
  | 'inflation_report'
  | 'autopsy'

type LegalMode = 'lawsuit' | 'arbitration'
type ActiveModule = 'full_simulation' | 'comparison_tool' | 'quick_demo' | 'scenario_mode'

function initStats(): GameStats {
  return { wins: 0, losses: 0, scUses: 0, classicUses: 0, concordatos: 0 }
}

export interface GameState {
  // Persistent
  coins: number
  trustScores: TrustScores
  stats: GameStats
  capitalProtected: number
  legalRisk: number
  sessionCount: number
  // Game session
  phase: GamePhase
  activeModule: ActiveModule
  selectedBot: Bot | null
  chosenMethod: 'smart' | 'classic' | 'arbitration' | null
  hasPlayedClassic: boolean
  crashActive: boolean
  dominoBump: number
  contractId: string | null
  outcome: { won: boolean; reward: number } | null
  autopsy: ReturnType<typeof import('../utils/math').computeAutopsy> | null
  konkordato: boolean
  selectedLawyer: Lawyer | null
  legalMode: LegalMode
  showConfetti: boolean
  showLossFlash: boolean
  activeEvent: RandomEvent | null
  eventEffect: EventEffect | null
  contractCount: number
  simDate: { year: number; month: number }
  // Modals
  showInsolvency: boolean
  pendingLoanRequest: Bot | null
  loanState: 'lending' | 'repaid' | 'defaulted' | null
  activeLoan: { bot: Bot; amount: number; interest: number } | null
  showMiniLawsuit: boolean
  showConsent: boolean
  // ContractBuilder
  contractParams: ContractParams
}

export interface GameActions {
  setCoins: (n: number | ((prev: number) => number)) => void
  setPhase: (p: GamePhase) => void
  setActiveModule: (m: ActiveModule) => void
  selectBot: (bot: Bot | null) => void
  selectLawyer: (lawyer: Lawyer | null) => void
  setChosenMethod: (m: GameState['chosenMethod']) => void
  updateParams: (params: Partial<ContractParams>) => void
  applyTrust: (botId: string, event: Parameters<typeof applyTrustUpdate>[2]) => void
  addDominoBump: (amount: number) => void
  reduceDominoBump: () => void
  setCrash: (active: boolean) => void
  setOutcome: (o: GameState['outcome']) => void
  setAutopsy: (a: GameState['autopsy']) => void
  setKonkordato: (k: boolean) => void
  setContractId: (id: string | null) => void
  setLegalMode: (m: LegalMode) => void
  setShowConfetti: (v: boolean) => void
  setShowLossFlash: (v: boolean) => void
  setActiveEvent: (e: RandomEvent | null) => void
  setEventEffect: (e: EventEffect | null) => void
  setShowInsolvency: (v: boolean) => void
  setPendingLoanRequest: (bot: Bot | null) => void
  setLoanState: (s: GameState['loanState']) => void
  setActiveLoan: (l: GameState['activeLoan']) => void
  setShowMiniLawsuit: (v: boolean) => void
  setShowConsent: (v: boolean) => void
  setHasPlayedClassic: (v: boolean) => void
  setSimDate: (d: { year: number; month: number }) => void
  incrementContractCount: () => void
  updateStats: (patch: Partial<GameStats>) => void
  addCapitalProtected: (amount: number) => void
  addLegalRisk: (amount: number) => void
  resetGameSession: () => void
  resetAll: () => void
}

export function useGameState(): GameState & GameActions {
  const persisted = loadPersisted()

  const [coins, setCoins]                       = useState<number>(() => persisted?.coins ?? INITIAL_COINS)
  const [trustScores, setTrustScores]           = useState<TrustScores>(() => persisted?.trustScores ?? initTrustScores())
  const [stats, setStats]                       = useState<GameStats>(() => persisted?.stats ?? initStats())
  const [capitalProtected, setCapitalProtected] = useState<number>(() => persisted?.capitalProtected ?? 0)
  const [legalRisk, setLegalRisk]               = useState<number>(() => persisted?.legalRisk ?? 0)
  const [sessionCount]                          = useState<number>(() => {
    try {
      const n = parseInt(localStorage.getItem('jd_session_count') ?? '0', 10)
      localStorage.setItem('jd_session_count', String(n + 1))
      return n
    } catch { return 0 }
  })

  // Game session state
  const [phase, setPhase]                     = useState<GamePhase>('select_bot')
  const [activeModule, setActiveModule]       = useState<ActiveModule>('full_simulation')
  const [selectedBot, setSelectedBot]         = useState<Bot | null>(null)
  const [chosenMethod, setChosenMethod]       = useState<GameState['chosenMethod']>(null)
  const [hasPlayedClassic, setHasPlayedClassic] = useState(false)
  const [crashActive, setCrashActive]         = useState(false)
  const [dominoBump, setDominoBump]           = useState(0)
  const [contractId, setContractId]           = useState<string | null>(null)
  const [outcome, setOutcome]                 = useState<GameState['outcome']>(null)
  const [autopsy, setAutopsy]                 = useState<GameState['autopsy']>(null)
  const [konkordato, setKonkordato]           = useState(false)
  const [selectedLawyer, setSelectedLawyer]   = useState<Lawyer | null>(null)
  const [legalMode, setLegalMode]             = useState<LegalMode>('lawsuit')
  const [showConfetti, setShowConfetti]       = useState(false)
  const [showLossFlash, setShowLossFlash]     = useState(false)
  const [activeEvent, setActiveEvent]         = useState<RandomEvent | null>(null)
  const [eventEffect, setEventEffect]         = useState<EventEffect | null>(null)
  const [contractCount, setContractCount]     = useState(0)
  const [simDate, setSimDate]                 = useState({ year: LAWSUIT_START_YEAR, month: LAWSUIT_START_MONTH })
  const [contractParams, setContractParams]   = useState<ContractParams>({ timeout: 15, penaltyRate: 20, useOracle: false })

  // Modals
  const [showInsolvency, setShowInsolvency]       = useState(false)
  const [pendingLoanRequest, setPendingLoanRequest] = useState<Bot | null>(null)
  const [loanState, setLoanState]                 = useState<GameState['loanState']>(null)
  const [activeLoan, setActiveLoan]               = useState<GameState['activeLoan']>(null)
  const [showMiniLawsuit, setShowMiniLawsuit]     = useState(false)
  const [showConsent, setShowConsent]             = useState(() => {
    try { return !localStorage.getItem('jd_consent_given') } catch { return true }
  })

  // Persist on relevant state change
  useEffect(() => {
    savePersisted({ coins, trustScores, stats, capitalProtected, legalRisk })
  }, [coins, trustScores, stats, capitalProtected, legalRisk])

  const applyTrust = useCallback((botId: string, event: Parameters<typeof applyTrustUpdate>[2]) => {
    setTrustScores(prev => applyTrustUpdate(prev, botId, event))
  }, [])

  const addDominoBump = useCallback((amount: number) => {
    setDominoBump(prev => prev + amount)
  }, [])

  const reduceDominoBump = useCallback(() => {
    setDominoBump(prev => Math.max(0, prev - DOMINO_RECOVERY))
  }, [])

  const incrementContractCount = useCallback(() => {
    setContractCount(prev => prev + 1)
  }, [])

  const updateStats = useCallback((patch: Partial<GameStats>) => {
    setStats(prev => ({ ...prev, ...patch }))
  }, [])

  const addCapitalProtected = useCallback((amount: number) => {
    setCapitalProtected(prev => prev + amount)
  }, [])

  const addLegalRisk = useCallback((amount: number) => {
    setLegalRisk(prev => prev + amount)
  }, [])

  const updateParams = useCallback((params: Partial<ContractParams>) => {
    setContractParams(prev => ({ ...prev, ...params }))
  }, [])

  const resetGameSession = useCallback(() => {
    setPhase('select_bot' as GamePhase)
    setSelectedBot(null)
    setChosenMethod(null)
    setContractId(null)
    setOutcome(null)
    setAutopsy(null)
    setKonkordato(false)
    setSelectedLawyer(null)
    setLegalMode('lawsuit')
    setShowConfetti(false)
    setShowLossFlash(false)
    setContractParams({ timeout: 15, penaltyRate: 20, useOracle: false })
    setPendingLoanRequest(null)
    setLoanState(null)
    setActiveLoan(null)
    setShowMiniLawsuit(false)
  }, [])

  const resetAll = useCallback(() => {
    setCoins(INITIAL_COINS)
    setTrustScores(initTrustScores())
    setStats(initStats())
    setCapitalProtected(0)
    setLegalRisk(0)
    setDominoBump(0)
    setCrashActive(false)
    setContractCount(0)
    setActiveEvent(null)
    setEventEffect(null)
    setSimDate({ year: LAWSUIT_START_YEAR, month: LAWSUIT_START_MONTH })
    resetGameSession()
    track('SESSION_START', { reset: true })
  }, [resetGameSession])

  return {
    coins, trustScores, stats, capitalProtected, legalRisk, sessionCount,
    phase, activeModule, selectedBot, chosenMethod, hasPlayedClassic,
    crashActive, dominoBump, contractId, outcome, autopsy, konkordato,
    selectedLawyer, legalMode, showConfetti, showLossFlash,
    activeEvent, eventEffect, contractCount, simDate,
    showInsolvency, pendingLoanRequest, loanState, activeLoan, showMiniLawsuit, showConsent,
    contractParams,
    setCoins, setPhase, setActiveModule,
    selectBot: setSelectedBot, selectLawyer: setSelectedLawyer,
    setChosenMethod, updateParams,
    applyTrust, addDominoBump, reduceDominoBump,
    setCrash: setCrashActive,
    setOutcome, setAutopsy, setKonkordato, setContractId,
    setLegalMode, setShowConfetti, setShowLossFlash,
    setActiveEvent, setEventEffect,
    setShowInsolvency, setPendingLoanRequest, setLoanState, setActiveLoan,
    setShowMiniLawsuit, setShowConsent, setHasPlayedClassic, setSimDate,
    incrementContractCount, updateStats, addCapitalProtected, addLegalRisk,
    resetGameSession, resetAll,
  }
}
