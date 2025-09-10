"use client"

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { useSimulationStore } from '@/store/simulationStore'

export default function Dashboard() {
  const history = useSimulationStore((s) => s.history)
  const data = history.map((h) => ({
    t: Math.floor(h.tick / 12),
    dissolvedOxygen: h.dissolvedOxygen,
    nutrients: h.nutrients,
    smallFish: h.smallFish,
  }))
  return (
    <div className="w-full h-[260px] p-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
          <XAxis dataKey="t" tick={{ fontSize: 12 }} label={{ value: '年份', position: 'insideBottomRight', offset: -4 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="dissolvedOxygen" stroke="#1e90ff" dot={false} name="溶解氧" />
          <Line type="monotone" dataKey="nutrients" stroke="#6f42c1" dot={false} name="营养物" />
          <Line type="monotone" dataKey="smallFish" stroke="#28a745" dot={false} name="小型鱼类" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
