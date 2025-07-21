"use client"

import { motion } from "framer-motion"

interface StepCardProps {
  step: {
    title: string
    description: string
  }
  isActive: boolean
}

export function StepCard({ step, isActive }: StepCardProps) {
  return (
    <div className="flex items-center space-x-3 p-3 border border-black rounded-lg">
      <motion.div
        className="w-2 h-2 border border-black"
        animate={{
          backgroundColor: isActive ? "#08451b" : "transparent",
        }}
        transition={{ duration: 0.3 }}
      />
      <div>
        <div className="font-semibold text-sm">{step.title}</div>
        <div className="text-xs text-[#555555]">{step.description}</div>
      </div>
    </div>
  )
}
