"use client"

import { motion } from "framer-motion"

interface Skill {
  name: string
  type: "terminal" | "screenshot" | "code" | "gif"
  content: string
}

interface SkillChipProps {
  skill: Skill
}

export function SkillChip({ skill }: SkillChipProps) {
  const renderContent = () => {
    switch (skill.type) {
      case "terminal":
        return (
          <div className="bg-[#F5F5F5] p-2 rounded font-mono text-xs">
            <div>$ docker build --target prod .</div>
            <div className="text-[#3BA55D]">✓ Build complete</div>
          </div>
        )
      case "screenshot":
        return (
          <div className="border-2 border-dashed border-[#555555] rounded p-4 text-center">
            <div className="text-lg mb-1">📸</div>
            <div className="text-xs text-[#555555]">GraphQL IDE</div>
          </div>
        )
      case "code":
        return (
          <div className="bg-[#F5F5F5] p-2 rounded font-mono text-xs">
            <div>service Health &#123;</div>
            <div> rpc Check() returns (Status);</div>
            <div>&#125;</div>
          </div>
        )
      case "gif":
        return (
          <div className="border-2 border-dashed border-[#555555] rounded p-4 text-center">
            <div className="text-lg mb-1">🎬</div>
            <div className="text-xs text-[#555555]">WebSocket Demo</div>
          </div>
        )
    }
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="border border-black rounded-lg p-3 w-48 cursor-pointer"
    >
      <h3 className="font-semibold mb-2">{skill.name}</h3>
      <p className="text-xs text-[#555555] mb-3">{skill.content}</p>
      {renderContent()}
    </motion.div>
  )
}
