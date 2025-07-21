"use client"

import { RadarChart } from "./RadarChart"
import { SkillChip } from "./SkillChip"

const skills = [
  { name: "Docker Build", type: "terminal", content: "Multi-stage container optimization" },
  { name: "GraphQL IDE", type: "screenshot", content: "Schema-first API development" },
  { name: "gRPC Proto", type: "code", content: "High-performance service communication" },
  { name: "WebSocket Chat", type: "gif", content: "Real-time bidirectional messaging" },
]

export function SkillRadar() {
  return (
    <div className="h-screen flex flex-col items-center justify-center p-8">
      <h2 className="text-6xl font-black mb-16 text-[#00FFCC]">SKILL RADAR</h2>

      <div className="mb-16">
        <RadarChart />
      </div>

      <div className="flex space-x-8 overflow-x-auto max-w-6xl">
        {skills.map((skill, index) => (
          <SkillChip key={index} skill={skill} />
        ))}
      </div>
    </div>
  )
}
