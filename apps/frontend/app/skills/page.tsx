"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import { SkillDemoCard } from "../components/SkillDemoCard"

const categories = ["All", "Backend", "Cloud", "DevOps", "Frontend"]

const skills = [
  {
    title: "Docker Build",
    category: "DevOps",
    type: "terminal",
    content: "Building multi-stage containers with optimized layers",
  },
  {
    title: "GraphQL IDE",
    category: "Backend",
    type: "screenshot",
    content: "Schema-first API development with type safety",
  },
  {
    title: "gRPC Health",
    category: "Backend",
    type: "badge",
    content: "High-performance service communication",
  },
  {
    title: "WebSocket Chat",
    category: "Frontend",
    type: "gif",
    content: "Real-time bidirectional communication",
  },
]

export default function SkillsPage() {
  const [activeCategory, setActiveCategory] = useState("All")

  const filteredSkills = activeCategory === "All" ? skills : skills.filter((skill) => skill.category === activeCategory)

  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="grid-container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, type: "spring" }}
          className="col-span-12 mb-16"
        >
          <h1 className="text-6xl font-black mb-4">Skills</h1>
          <p className="text-xl text-gray-600 mb-8">Technical demonstrations and capabilities</p>

          <div className="flex flex-wrap gap-4">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-6 py-2 rounded-full transition-all ${
                  activeCategory === category
                    ? "bg-[#00FFCC] text-[#0D0D0D] font-bold"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredSkills.map((skill, index) => (
            <motion.div
              key={skill.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, type: "spring", delay: index * 0.1 }}
            >
              <SkillDemoCard skill={skill} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
