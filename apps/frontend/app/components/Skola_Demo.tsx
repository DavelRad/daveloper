"use client"

import { useState } from "react"
import { motion } from "framer-motion"

const modules = [
  { name: "Courses", icon: "📚", enabled: true },
  { name: "Forum", icon: "💬", enabled: true },
  { name: "Calendar", icon: "📅", enabled: false },
  { name: "Analytics", icon: "📊", enabled: true },
]

export function Skola_Demo() {
  const [moduleStates, setModuleStates] = useState(modules)

  const toggleModule = (index: number) => {
    setModuleStates((prev) => prev.map((module, i) => (i === index ? { ...module, enabled: !module.enabled } : module)))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Platform Modules</h3>
        <div className="text-sm text-gray-600">
          <span className="font-medium">Tier: Pro</span> • Members: 1,240
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {moduleStates.map((module, index) => (
          <motion.div
            key={module.name}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toggleModule(index)}
            className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
              module.enabled ? "border-green-300 bg-green-50" : "border-gray-300 bg-gray-50"
            }`}
          >
            <div className="text-center">
              <div className="text-3xl mb-2">{module.icon}</div>
              <div className="font-medium">{module.name}</div>
              <div className={`text-sm mt-1 ${module.enabled ? "text-green-600" : "text-gray-500"}`}>
                {module.enabled ? "Active" : "Disabled"}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
