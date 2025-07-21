"use client"

import { motion } from "framer-motion"

const skills = [
  "AWS",
  "Docker",
  "Redis",
  "GraphQL",
  "gRPC",
  "WebSockets",
  "LangChain",
  "TypeScript",
  "Python",
  "Kubernetes",
  "PostgreSQL",
  "Next.js",
]

export function SkillsStrip() {
  return (
    <div className="grid-container">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.15, type: "spring" }}
        className="col-span-12"
      >
        <h2 className="text-3xl font-bold mb-8 text-center">Technologies</h2>

        <div className="overflow-hidden">
          <div className="flex space-x-8 marquee">
            {[...skills, ...skills].map((skill, index) => (
              <div
                key={index}
                className="flex-shrink-0 bg-white rounded-full px-6 py-3 shadow-md font-medium whitespace-nowrap"
              >
                {skill}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
