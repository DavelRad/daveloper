"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"

const skills = ["AWS", "Docker", "gRPC", "GraphQL", "WebSockets", "LangGraph"]
const values = [90, 85, 80, 95, 88, 92]

export function RadarChart() {
  const ref = useRef<SVGSVGElement>(null)
  const isInView = useInView(ref, { once: true })

  const center = 150
  const radius = 100
  const angleStep = (2 * Math.PI) / skills.length

  const getPoint = (value: number, index: number) => {
    const angle = index * angleStep - Math.PI / 2
    const r = (value / 100) * radius
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    }
  }

  const pathData =
    values
      .map((value, index) => {
        const point = getPoint(value, index)
        return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
      })
      .join(" ") + " Z"

  return (
    <div className="relative">
      <svg ref={ref} width="300" height="300" className="overflow-visible">
        {/* Grid circles */}
        {[20, 40, 60, 80, 100].map((percent) => (
          <circle
            key={percent}
            cx={center}
            cy={center}
            r={(percent / 100) * radius}
            fill="none"
            stroke="rgba(234, 234, 234, 0.1)"
            strokeWidth="1"
          />
        ))}

        {/* Grid lines */}
        {skills.map((_, index) => {
          const angle = index * angleStep - Math.PI / 2
          const endX = center + radius * Math.cos(angle)
          const endY = center + radius * Math.sin(angle)
          return (
            <line
              key={index}
              x1={center}
              y1={center}
              x2={endX}
              y2={endY}
              stroke="rgba(234, 234, 234, 0.1)"
              strokeWidth="1"
            />
          )
        })}

        {/* Data area */}
        <motion.path
          d={pathData}
          fill="url(#radarGradient)"
          stroke="#00FFCC"
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
          transition={{ duration: 2, ease: "easeInOut" }}
        />

        {/* Data points */}
        {values.map((value, index) => {
          const point = getPoint(value, index)
          return (
            <motion.circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#00FFCC"
              initial={{ scale: 0 }}
              animate={isInView ? { scale: 1 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 + 1 }}
            />
          )
        })}

        {/* Labels */}
        {skills.map((skill, index) => {
          const angle = index * angleStep - Math.PI / 2
          const labelX = center + (radius + 30) * Math.cos(angle)
          const labelY = center + (radius + 30) * Math.sin(angle)
          return (
            <text
              key={index}
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#EAEAEA"
              fontSize="14"
              fontWeight="bold"
            >
              {skill}
            </text>
          )
        })}

        <defs>
          <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00FFCC" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00FFCC" stopOpacity="0.1" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  )
}
