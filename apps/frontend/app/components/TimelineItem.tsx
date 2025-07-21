"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { motion } from "framer-motion"

interface TimelineItemProps {
  item: {
    date: string
    title: string
    detail: string
  }
  isActive: boolean
}

export function TimelineItem({ item, isActive }: TimelineItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <motion.div
      className="border border-black rounded-lg p-6"
      animate={{
        borderColor: isActive ? "#08451b" : "#000000",
        backgroundColor: isActive ? "#f8fdf9" : "transparent",
      }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wider text-[#555555] mb-2 font-mono">{item.date}</div>
          <h3 className="font-semibold text-lg mb-3">{item.title}</h3>
          <p className="text-sm text-[#555555] mb-4">{item.detail}</p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-4 p-2 hover:bg-[#F5F5F5] rounded transition-colors"
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-4 pt-4 border-t border-black border-opacity-10 text-sm text-[#555555]"
        >
          Additional details and context about this experience would go here. This expanded section provides more room
          for storytelling and specific achievements.
        </motion.div>
      )}
    </motion.div>
  )
}
