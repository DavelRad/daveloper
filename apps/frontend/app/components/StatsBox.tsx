"use client"

import { motion } from "framer-motion"
import { mockSkillsData } from "../lib/mockSkillsData"

interface StatsBoxProps {
  activeIndex: number
}

export function StatsBox({ activeIndex }: StatsBoxProps) {
  const currentStats = mockSkillsData[activeIndex] || mockSkillsData[0]

  const backendSkills = [
    { name: "Python", level: currentStats.techStack.find((s) => s.name === "Python")?.level || 0 },
    { name: "NestJS", level: currentStats.techStack.find((s) => s.name === "NestJS")?.level || 0 },
    { name: "gRPC", level: currentStats.techStack.find((s) => s.name === "gRPC")?.level || 0 },
    { name: "Postgre", level: currentStats.techStack.find((s) => s.name === "PostgreSQL")?.level || 0 },
  ]

  const frontendSkills = [
    { name: "React", level: currentStats.react || 0 },
    { name: "Next.js", level: currentStats.nextjs || 0 },
    { name: "Tailwind", level: currentStats.tailwind || 0 },
    { name: "FramerM", level: currentStats.framer || 0 },
  ]

  const devopsSkills = [
    { name: "Docker", level: currentStats.techStack.find((s) => s.name === "Docker")?.level || 0 },
    { name: "AWS", level: currentStats.techStack.find((s) => s.name === "AWS")?.level || 0 },
    { name: "Redis", level: currentStats.techStack.find((s) => s.name === "Redis")?.level || 0 },
    { name: "CI/CD", level: currentStats.cicd || 0 },
  ]

  // Radar chart data
  const radarData = [
    { label: "Languages", value: currentStats.techStack.find((s) => s.name === "Python")?.level || 0 },
    { label: "Web", value: currentStats.nextjs || 0 },
    { label: "Database", value: currentStats.techStack.find((s) => s.name === "PostgreSQL")?.level || 0 },
    { label: "DevOps", value: currentStats.techStack.find((s) => s.name === "Docker")?.level || 0 },
    { label: "Cloud", value: currentStats.techStack.find((s) => s.name === "AWS")?.level || 0 },
    { label: "AI/ML", value: currentStats.llmAgents || 0 },
  ]

  return (
    <div className="bg-white border border-black rounded-lg p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wider mb-4 font-mono">SKILL PROGRESSION</div>

      {/* Three-Column Compact Layout */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
        {/* Backend */}
        <div>
          <div className="text-xs uppercase mb-2 text-[#555555] font-mono">BACKEND</div>
          <div className="space-y-1">
            {backendSkills.map((skill) => (
              <div key={skill.name} className="flex items-center">
                <span className="font-mono w-12 text-left text-xs">{skill.name}</span>
                <div className="flex-1 ml-2">
                  <div className="w-full h-1 bg-[#F5F5F5] border border-black rounded-sm overflow-hidden">
                    <motion.div
                      className="h-full bg-[#08451b]"
                      initial={{ width: 0 }}
                      animate={{ width: `${skill.level}%` }}
                      transition={{ duration: 0.6, delay: 0.1 }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Frontend */}
        <div>
          <div className="text-xs uppercase mb-2 text-[#555555] font-mono">FRONTEND</div>
          <div className="space-y-1">
            {frontendSkills.map((skill) => (
              <div key={skill.name} className="flex items-center">
                <span className="font-mono w-12 text-left text-xs">{skill.name}</span>
                <div className="flex-1 ml-2">
                  <div className="w-full h-1 bg-[#F5F5F5] border border-black rounded-sm overflow-hidden">
                    <motion.div
                      className="h-full bg-[#08451b]"
                      initial={{ width: 0 }}
                      animate={{ width: `${skill.level}%` }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DevOps */}
        <div>
          <div className="text-xs uppercase mb-2 text-[#555555] font-mono">DEVOPS</div>
          <div className="space-y-1">
            {devopsSkills.map((skill) => (
              <div key={skill.name} className="flex items-center">
                <span className="font-mono w-12 text-left text-xs">{skill.name}</span>
                <div className="flex-1 ml-2">
                  <div className="w-full h-1 bg-[#F5F5F5] border border-black rounded-sm overflow-hidden">
                    <motion.div
                      className="h-full bg-[#08451b]"
                      initial={{ width: 0 }}
                      animate={{ width: `${skill.level}%` }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mini Radar Chart */}
      <div className="mb-4">
        <div className="flex justify-center">
          <svg width="120" height="120" className="overflow-visible">
            {/* Grid circles */}
            {[20, 40, 60, 80, 100].map((percent) => (
              <circle
                key={percent}
                cx="60"
                cy="60"
                r={(percent / 100) * 40}
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="0.5"
              />
            ))}

            {/* Grid lines */}
            {radarData.map((_, index) => {
              const angle = (index / radarData.length) * 2 * Math.PI - Math.PI / 2
              const endX = 60 + 40 * Math.cos(angle)
              const endY = 60 + 40 * Math.sin(angle)
              return <line key={index} x1="60" y1="60" x2={endX} y2={endY} stroke="#E5E7EB" strokeWidth="0.5" />
            })}

            {/* Data polygon */}
            <motion.polygon
              points={radarData
                .map((item, index) => {
                  const angle = (index / radarData.length) * 2 * Math.PI - Math.PI / 2
                  const radius = (item.value / 100) * 40
                  const x = 60 + radius * Math.cos(angle)
                  const y = 60 + radius * Math.sin(angle)
                  return `${x},${y}`
                })
                .join(" ")}
              fill="rgba(8, 69, 27, 0.2)"
              stroke="#08451b"
              strokeWidth="1"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            />

            {/* Labels */}
            {radarData.map((item, index) => {
              const angle = (index / radarData.length) * 2 * Math.PI - Math.PI / 2
              const labelX = 60 + 50 * Math.cos(angle)
              const labelY = 60 + 50 * Math.sin(angle)
              return (
                <text
                  key={index}
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="8"
                  fill="#555555"
                  className="font-mono"
                >
                  {item.label}
                </text>
              )
            })}
          </svg>
        </div>
      </div>

      {/* Compact Stats Row */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="text-center">
          <div className="text-lg font-mono">{currentStats.hackathonWins}</div>
          <div className="text-[#555555] font-mono">WINS</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-mono">{currentStats.projectsBuilt}</div>
          <div className="text-[#555555] font-mono">PROJECTS</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-mono">{currentStats.infraMaturity}%</div>
          <div className="text-[#555555] font-mono">INFRA</div>
        </div>
      </div>
    </div>
  )
}
