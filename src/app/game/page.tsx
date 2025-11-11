"use client"

import Visualizer from '@/components/visual/Visualizer'
import Dashboard from '@/components/panels/Dashboard'
import Controls from '@/components/panels/Controls'
import EventLog from '@/components/panels/EventLog'
import StageModals from '@/components/panels/Modals'
import { useEffect } from 'react'
import { useSimulationStore, useTickLoop } from '@/store/simulationStore'
import ThemeColors from '@/components/ThemeColors'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function GamePage() {
  const gameStage = useSimulationStore((s) => s.gameStage)
  useEffect(() => {
    useSimulationStore.getState().actions.initialize()
  }, [])
  useTickLoop()
  
  return (
    <div className="min-h-screen w-full p-6 bg-[--ui-bg] text-[--ui-text]">
      <ThemeColors />
      
      {/* Navigation Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/">
            <Button variant="outline" size="sm" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">My Digital Biome</h1>
          <p className="text-[--ui-text-secondary]">最小可行版本 · 观察 → 干预 → 见证 → 修复</p>
        </div>
      </div>
      
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8">
          <Visualizer />
        </div>
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="rounded-xl border bg-[--ui-panel] p-2">
            <Dashboard />
          </div>
          <div className="rounded-xl border bg-[--ui-panel] p-2">
            <Controls />
          </div>
        </div>
        <div className="col-span-12">
          <div className="rounded-xl border bg-[--ui-panel] p-2">
            <EventLog />
          </div>
        </div>
      </div>
      <StageModals key={gameStage} />
    </div>
  )
}
