"use client"

import Image from 'next/image'
import colors from '@/app/assets/tokens/colors.json'
import { useSimulationStore, evaluateTheme } from '@/store/simulationStore'
import thresholds from '@/app/assets/tokens/thresholds.json'

export default function Visualizer() {
  const biomeState = useSimulationStore((s) => s.biomeState)
  const engine = useSimulationStore((s) => s.engine)
  const theme = evaluateTheme(biomeState)

  const palette = (colors as any).palette[theme]
  const waterColor = palette.water as string
  const plantColor = palette.plant as string

  const showAlgae = (() => {
    const cfg = thresholds.visuals.algaeOverlay as any
    if (!cfg) return false
    if (cfg.logic === 'OR') {
      return biomeState.phytoplankton >= (cfg.phytoplanktonMin ?? 999) || biomeState.waterTurbidity >= (cfg.waterTurbidityMin ?? 999)
    }
    return biomeState.phytoplankton >= (cfg.phytoplanktonMin ?? 999) && biomeState.waterTurbidity >= (cfg.waterTurbidityMin ?? 999)
  })()

  const showBubbles = engine.flags.aeratorActive === true

  // derive opacity from turbidity (0..100 -> 0.2 .. 0.95)
  const opacity = Math.min(0.9, 0.35 + biomeState.waterTurbidity * 0.005)

  // derive counts for fish/plants (coarse, not exact)
  const plants = Math.round(biomeState.aquaticPlants / 20)
  const smallFish = Math.round(biomeState.smallFish / 20)
  const largeFish = Math.round(biomeState.largeFish / 20)

  return (
    <div className="relative w-full h-[420px] rounded-xl overflow-hidden border bg-[--ui-panel]">
      {/* Background illustration */}
      <div className="absolute inset-0">
        <Image src="/assets/svg/pond-background.svg" alt="pond background" fill priority style={{ objectFit: 'cover' }} />
      </div>

      {/* Water layer */}
      <div className="absolute inset-0" style={{ backgroundColor: waterColor, opacity }} />

      {/* Algae overlay */}
      {showAlgae && (
        <div className="absolute inset-0 opacity-60">
          <Image src="/assets/svg/algae-overlay.svg" alt="algae" fill style={{ objectFit: 'cover' }} />
        </div>
      )}

      {/* Bubbles overlay (aerator) */}
      {showBubbles && (
        <div className="absolute inset-x-0 bottom-0 h-full pointer-events-none">
          <Image src="/assets/svg/aerator-bubbles.svg" alt="bubbles" fill style={{ objectFit: 'cover', opacity: 0.6 }} />
        </div>
      )}

      {/* Plants */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-around p-4">
        {Array.from({ length: Math.max(0, Math.min(plants, 6)) }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <PlantIcon key={`p-${i}`} color={plantColor} />
        ))}
      </div>

      {/* Fish */}
      <div className="absolute inset-0">
        {/* small fish */}
        {Array.from({ length: Math.max(0, Math.min(smallFish, 8)) }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <FishSmall key={`sf-${i}`} left={(i * 12 + 10) % 90} top={20 + (i * 7) % 60} />
        ))}
        {/* large fish */}
        {Array.from({ length: Math.max(0, Math.min(largeFish, 4)) }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <FishLarge key={`lf-${i}`} left={(i * 25 + 5) % 90} top={30 + (i * 12) % 50} />
        ))}
      </div>

      {/* HUD minimal text */}
      <div className="absolute top-2 left-2 text-xs rounded bg-white/70 px-2 py-1 text-neutral-800">
        <span>Tick: {biomeState.tick} | Theme: {theme}</span>
      </div>
    </div>
  )}

function PlantIcon({ color }: { color: string }) {
  return (
    <div style={{ color }}>
      <Image src="/assets/svg/plant-01.svg" alt="plant" width={32} height={64} />
    </div>
  )
}

function FishSmall({ left, top }: { left: number; top: number }) {
  return (
    <div className="absolute" style={{ left: `${left}%`, top: `${top}%` }}>
      <Image src="/assets/svg/fish-small.svg" alt="small fish" width={28} height={18} />
    </div>
  )
}

function FishLarge({ left, top }: { left: number; top: number }) {
  return (
    <div className="absolute" style={{ left: `${left}%`, top: `${top}%` }}>
      <Image src="/assets/svg/fish-large.svg" alt="large fish" width={40} height={22} />
    </div>
  )
}
