"use client"

import { useTransform, motion, type MotionValue } from "framer-motion"
import { useEffect, useState } from "react"

interface StatsWidgetProps {
  title: string
  value: number
  unit: string
  color: string
  scrollProgress: MotionValue<number>
}

export function StatsWidget({ title, value, unit, color, scrollProgress }: StatsWidgetProps) {
  const [displayValue, setDisplayValue] = useState(0)

  const animatedValue = useTransform(scrollProgress, [0.2, 0.6], [0, value])

  useEffect(() => {
    const unsubscribe = animatedValue.onChange((latest) => {
      setDisplayValue(latest)
    })
    return unsubscribe
  }, [animatedValue])

  return (
    <motion.div
      className="glass-morph rounded-xl p-6 text-center"
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <h3 className="text-lg font-bold mb-4 opacity-75">{title}</h3>
      <div className="text-4xl font-black mb-2" style={{ color }}>
        {displayValue.toFixed(unit === "GB" ? 1 : 0)}
        {unit}
      </div>
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            backgroundColor: color,
            width: `${(displayValue / value) * 100}%`,
          }}
        />
      </div>
    </motion.div>
  )
}
