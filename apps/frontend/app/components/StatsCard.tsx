"use client"

import { motion } from "framer-motion"

interface StatsCardProps {
  title: string
  value: string
  trend: string
  color: string
}

export function StatsCard({ title, value, trend, color }: StatsCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.15, type: "spring" }}
      className="bg-white rounded-2xl p-6 shadow-lg"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-600">{title}</h3>
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      </div>

      <div className="mb-2">
        <span className="text-3xl font-bold">{value}</span>
      </div>

      <div className="text-sm text-gray-500">{trend}</div>
    </motion.div>
  )
}
