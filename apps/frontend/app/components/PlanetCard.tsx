"use client"

import { useState } from "react"
import { motion } from "framer-motion"

interface Planet {
  id: string
  name: string
  tag: string
  color: string
  orbitClass: string
}

interface PlanetCardProps {
  planet: Planet
}

export function PlanetCard({ planet }: PlanetCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      className="relative"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.5 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <div
        className="w-24 h-24 rounded-full interactive cursor-pointer flex items-center justify-center text-white font-bold text-sm"
        style={{ backgroundColor: planet.color, boxShadow: `0 0 20px ${planet.color}40` }}
      >
        {planet.name.charAt(0)}
      </div>

      {isHovered && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute top-28 left-1/2 transform -translate-x-1/2 bg-[#070707] border border-[#00FFCC] rounded-lg p-4 min-w-64 z-10"
        >
          <h3 className="text-xl font-bold mb-2 text-[#00FFCC]">{planet.name}</h3>
          <p className="text-sm mb-3 opacity-75">{planet.tag}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2 py-1 bg-[#00FFCC] text-[#070707] rounded text-xs font-medium">Python</span>
            <span className="px-2 py-1 bg-[#00FFCC] text-[#070707] rounded text-xs font-medium">Next.js</span>
            <span className="px-2 py-1 bg-[#00FFCC] text-[#070707] rounded text-xs font-medium">AI</span>
          </div>

          <button className="w-full px-4 py-2 border border-[#00FFCC] text-[#00FFCC] rounded hover:bg-[#00FFCC] hover:text-[#070707] transition-all interactive">
            View Case
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
