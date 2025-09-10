"use client"

import { useEffect, useState } from 'react'
import { useSimulationStore } from '@/store/simulationStore'
import modals from '@/app/assets/content/modals.zh.json'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default function StageModals() {
  const gameStage = useSimulationStore((s) => s.gameStage)
  const actions = useSimulationStore((s) => s.actions)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    // open modal on stage change
    setOpen(true)
  }, [gameStage])

  const cfg = getModalCfg(gameStage)
  if (!cfg) return null

  const onPrimary = () => {
    if (gameStage === 'OBSERVING') {
      setOpen(false)
    } else if (gameStage === 'INTERVENING') {
      setOpen(false)
    } else if (gameStage === 'WITNESSING') {
      setOpen(false)
    } else if (gameStage === 'RESTORING') {
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cfg.title}</DialogTitle>
          <DialogDescription className="text-base text-neutral-700 whitespace-pre-line">{cfg.body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {cfg.secondaryCta && (
            <Button variant="outline" onClick={() => setOpen(false)}>{cfg.secondaryCta}</Button>
          )}
          <Button onClick={onPrimary}>{cfg.primaryCta}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function getModalCfg(stage: string) {
  const m: any = modals
  if (stage === 'OBSERVING') return m.stage1
  if (stage === 'INTERVENING') return m.stage2
  if (stage === 'WITNESSING') return m.stage3
  if (stage === 'RESTORING') return m.stage4
  return null
}

