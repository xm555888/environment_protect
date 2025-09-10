"use client"

import { create } from 'zustand'
import { useEffect } from 'react'
import { SimulationEngine } from '@/core/simulation'
import type { BiomeState, EventItem, GameStage, SpeedMode } from '@/core/types'
import thresholds from '@/app/assets/tokens/thresholds.json'
import eventsText from '@/app/assets/content/events.zh.json'

type EventsConfig = typeof thresholds.events
type VisualsConfig = typeof thresholds.visuals

interface SimulationState {
  engine: SimulationEngine
  gameStage: GameStage
  isPaused: boolean
  speed: SpeedMode
  biomeState: BiomeState
  history: BiomeState[]
  eventLog: EventItem[]
  lastEventTick: Record<string, number>
  witness: { startTick: number | null; targetTicks: number }
  actions: {
    initialize: () => void
    tick: () => void
    togglePause: () => void
    setSpeed: (speed: SpeedMode) => void
    toStage: (stage: GameStage) => void
    applyRunoff: () => void
    setAerator: (active: boolean) => void
    setBuffer: (active: boolean) => void
  }
}

const TPY = thresholds.time.ticksPerYear
const WITNESS_YEARS = thresholds.time.witnessYears

const findEventText = (key: string) => {
  const found = (eventsText as any).events?.find((e: any) => e.key === key)
  return found ? { text: found.text as string, severity: found.severity as EventItem['severity'] } : { text: key, severity: 'event' as const }
}

function checkCondition(state: BiomeState, cond: Record<string, number>): boolean {
  // cond like { nutrientsMin: 35 } or dissolvedOxygenMax: 60
  for (const [k, v] of Object.entries(cond)) {
    const [name, bound] = k.endsWith('Min') ? [k.replace(/Min$/, ''), 'Min'] as const : [k.replace(/Max$/, ''), 'Max'] as const
    const sv = (state as any)[name]
    if (sv === undefined) return false
    if (bound === 'Min' && !(sv >= v)) return false
    if (bound === 'Max' && !(sv <= v)) return false
  }
  return true
}

export function evaluateTheme(state: BiomeState): 'healthy' | 'polluted' | 'collapsed' {
  const rules = thresholds.visuals.themeRules as VisualsConfig['themeRules']
  // Priority: collapsed -> polluted -> healthy
  for (const r of rules) {
    if (r.theme === 'collapsed') {
      const any = r.any ?? []
      if (any.some(c => checkCondition(state, c as any))) return 'collapsed'
    }
  }
  for (const r of rules) {
    if (r.theme === 'polluted') {
      const any = r.any ?? []
      if (any.some(c => checkCondition(state, c as any))) return 'polluted'
    }
  }
  return 'healthy'
}

function evaluateEvents(state: BiomeState, lastEventTick: Record<string, number>, currentTick: number): EventItem[] {
  const out: EventItem[] = []
  const evCfg = thresholds.events as EventsConfig

  const tryEmit = (key: string, ok: boolean) => {
    if (!ok) return
    const cd = (evCfg as any)[key]?.cooldownTicks ?? 0
    const last = lastEventTick[key] ?? -Infinity
    if (currentTick - last < cd) return
    const meta = findEventText(key)
    out.push({ key, tick: currentTick, text: meta.text, severity: meta.severity })
    lastEventTick[key] = currentTick
  }

  tryEmit('ALGAE_BLOOM', (() => {
    const c = evCfg.ALGAE_BLOOM
    if (!c) return false
    if ((c as any).logic === 'OR') {
      return (state.phytoplankton >= (c as any).phytoplanktonMin) || (state.nutrients >= (c as any).nutrientsMin)
    }
    return state.phytoplankton >= (c as any).phytoplanktonMin && state.nutrients >= (c as any).nutrientsMin
  })())

  tryEmit('TURBIDITY_HIGH', state.waterTurbidity >= (evCfg.TURBIDITY_HIGH as any).waterTurbidityMin)
  tryEmit('DO_LOW', state.dissolvedOxygen <= (evCfg.DO_LOW as any).dissolvedOxygenMax)
  tryEmit('DO_CRITICAL', state.dissolvedOxygen <= (evCfg.DO_CRITICAL as any).dissolvedOxygenMax)
  tryEmit('PLANTS_DIE_OFF', state.aquaticPlants <= (evCfg.PLANTS_DIE_OFF as any).aquaticPlantsMax)
  tryEmit('SMALL_FISH_COLLAPSE', state.smallFish <= (evCfg.SMALL_FISH_COLLAPSE as any).smallFishMax)
  tryEmit('LARGE_FISH_VANISH', state.largeFish <= (evCfg.LARGE_FISH_VANISH as any).largeFishMax)

  // RECOVERY_HINT composite
  const rec = (evCfg as any).RECOVERY_HINT
  if (rec && rec.composite) {
    const ok = checkCondition(state, rec.composite)
    tryEmit('RECOVERY_HINT', ok)
  }

  return out
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  engine: new SimulationEngine(),
  gameStage: 'OBSERVING',
  isPaused: true,
  speed: 'NORMAL',
  biomeState: new SimulationEngine().state,
  history: [],
  eventLog: [],
  lastEventTick: {},
  witness: { startTick: null, targetTicks: WITNESS_YEARS * TPY },
  actions: {
    initialize: () => {
      const engine = new SimulationEngine()
      set({
        engine,
        biomeState: engine.state,
        history: [engine.state],
        eventLog: [],
        lastEventTick: {},
        isPaused: true,
        speed: 'NORMAL',
        gameStage: 'OBSERVING',
        witness: { startTick: null, targetTicks: WITNESS_YEARS * TPY },
      })
    },
    tick: () => {
      const { engine, lastEventTick, gameStage, witness } = get()
      engine.tick()
      const newState = { ...engine.state }

      // Evaluate theme-based and thresholds events
      const newly = evaluateEvents(newState, lastEventTick, newState.tick)

      const sampleEvery = thresholds.history.sampleEveryNTicks ?? 1
      const maxPoints = thresholds.history.desktopMaxPoints ?? 1200

      set((state) => {
        let history = state.history
        if (newState.tick % sampleEvery === 0) {
          history = [...history, newState]
          if (history.length > maxPoints) {
            history = history.slice(history.length - maxPoints)
          }
        }
        return {
          biomeState: newState,
          history,
          eventLog: newly.length ? [...state.eventLog, ...newly] : state.eventLog,
          lastEventTick: { ...lastEventTick },
        }
      })

      // Witness stage auto progression
      if (gameStage === 'WITNESSING') {
        const start = witness.startTick ?? newState.tick
        const reached = newState.tick - start >= witness.targetTicks
        if (witness.startTick == null) {
          set({ witness: { ...witness, startTick: start } })
        }
        if (reached) {
          get().actions.toStage('RESTORING')
        }
      }
    },
    togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
    setSpeed: (speed) => set({ speed }),
    toStage: (stage) => {
      const { engine } = get()
      if (stage === 'OBSERVING') {
        set({ gameStage: stage, isPaused: true, speed: 'NORMAL' })
      } else if (stage === 'INTERVENING') {
        set({ gameStage: stage, isPaused: true, speed: 'NORMAL' })
      } else if (stage === 'WITNESSING') {
        set({ gameStage: stage, isPaused: false, speed: 'FAST', witness: { startTick: null, targetTicks: WITNESS_YEARS * TPY } })
      } else if (stage === 'RESTORING') {
        set({ gameStage: stage, isPaused: false, speed: 'NORMAL' })
        // Optionally log recovery hint on enter
      }
      // Reset tools flags when switching earlier stages
      if (stage !== 'RESTORING') {
        engine.setAerator(false)
        engine.setBuffer(false)
      }
    },
    applyRunoff: () => {
      const { engine, lastEventTick } = get()
      engine.applyInterventionRunoff()
      const key = 'RUNOFF_INTRODUCED'
      const meta = findEventText(key)
      set((state) => ({
        biomeState: { ...engine.state },
        eventLog: [...state.eventLog, { key, tick: engine.state.tick, text: meta.text, severity: meta.severity }],
        lastEventTick: { ...lastEventTick, [key]: engine.state.tick },
      }))
    },
    setAerator: (active) => {
      const { engine, lastEventTick, biomeState } = get()
      engine.setAerator(active)
      const updates: Partial<SimulationState> = { biomeState: { ...biomeState } }
      if (active) {
        const key = 'AERATOR_ON'
        const meta = findEventText(key)
        updates.eventLog = [...get().eventLog, { key, tick: engine.state.tick, text: meta.text, severity: meta.severity }]
        updates.lastEventTick = { ...lastEventTick, [key]: engine.state.tick }
      }
      set(updates as any)
    },
    setBuffer: (active) => {
      const { engine, lastEventTick, biomeState } = get()
      engine.setBuffer(active)
      const updates: Partial<SimulationState> = { biomeState: { ...biomeState } }
      if (active) {
        const key = 'BUFFER_ON'
        const meta = findEventText(key)
        updates.eventLog = [...get().eventLog, { key, tick: engine.state.tick, text: meta.text, severity: meta.severity }]
        updates.lastEventTick = { ...lastEventTick, [key]: engine.state.tick }
      }
      set(updates as any)
    },
  },
}))

export function useTickLoop() {
  // A small helper hook to run the ticking loop based on store state
  const isPaused = useSimulationStore((s) => s.isPaused)
  const speed = useSimulationStore((s) => s.speed)
  const interval = speed === 'FAST' ? thresholds.time.tickMillisFast : thresholds.time.tickMillis
  useEffect(() => {
    if (isPaused) return
    const id = setInterval(() => {
      useSimulationStore.getState().actions.tick()
    }, interval)
    return () => clearInterval(id)
  }, [isPaused, speed, interval])
}

export function useVisualTheme() {
  const state = useSimulationStore((s) => s.biomeState)
  const theme = evaluateTheme(state)
  return theme
}
