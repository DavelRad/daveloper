"use client"

import { motion } from "framer-motion"

interface Project {
  title: string
  tagline: string
  description: string
  stack: string[]
  accent: string
}

interface ProjectHeroProps {
  project: Project
}

export function ProjectHero({ project }: ProjectHeroProps) {
  return (
    <div className="grid-container">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, type: "spring" }}
        className="col-span-12 mb-16"
      >
        <div
          className="w-full h-64 rounded-2xl mb-8 flex items-center justify-center text-white font-black text-4xl"
          style={{ backgroundColor: project.accent }}
        >
          {project.title}
        </div>

        <h1 className="text-6xl font-black mb-4">{project.title}</h1>
        <p className="text-2xl text-gray-600 mb-6">{project.tagline}</p>
        <p className="text-lg text-gray-700 mb-8 max-w-3xl">{project.description}</p>

        <div className="flex flex-wrap gap-3">
          {project.stack.map((tech) => (
            <span key={tech} className="px-4 py-2 bg-white text-gray-700 rounded-full font-medium shadow-md">
              {tech}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
