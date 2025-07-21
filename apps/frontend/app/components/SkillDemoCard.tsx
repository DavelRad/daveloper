"use client"

import { motion } from "framer-motion"

interface Skill {
  title: string
  category: string
  type: "terminal" | "screenshot" | "badge" | "gif"
  content: string
}

interface SkillDemoCardProps {
  skill: Skill
}

export function SkillDemoCard({ skill }: SkillDemoCardProps) {
  const renderDemo = () => {
    switch (skill.type) {
      case "terminal":
        return (
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-green-400 text-sm">
            <div className="mb-2">$ docker build -t app:latest .</div>
            <div className="text-gray-500">Building multi-stage container...</div>
            <div className="text-gray-500">✓ Layer optimization complete</div>
          </div>
        )
      case "screenshot":
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="text-gray-500">
              <div className="mb-2">📸 GraphQL Playground</div>
              <div className="text-sm">Schema introspection & queries</div>
            </div>
          </div>
        )
      case "badge":
        return (
          <div className="flex justify-center">
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-medium">✓ gRPC Service Healthy</div>
          </div>
        )
      case "gif":
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="text-gray-500">
              <div className="mb-2">🎬 WebSocket Demo</div>
              <div className="text-sm">Real-time chat animation</div>
            </div>
          </div>
        )
    }
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.15, type: "spring" }}
      className="bg-white rounded-2xl p-6 shadow-lg"
    >
      <div className="mb-4">
        <h3 className="text-xl font-bold mb-2">{skill.title}</h3>
        <p className="text-gray-600">{skill.content}</p>
      </div>

      {renderDemo()}
    </motion.div>
  )
}
