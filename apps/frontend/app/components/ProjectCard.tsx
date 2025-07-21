"use client"

import { motion } from "framer-motion"
import { useState } from "react"

interface Project {
  id: string
  title: string
  tagline: string
  tech: string[]
  logo: string
}

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      whileHover={{ y: -8, boxShadow: "0 10px 25px 0 rgba(0, 0, 0, 0.1)" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="border border-black rounded-lg p-4 cursor-pointer hover:border-[#08451b] transition-colors relative overflow-hidden"
    >
      {/* Hover effect background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-[#08451b]/5 to-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      <div className="relative z-10">
        <div className="flex items-start mb-3">
          <motion.div
            className="w-8 h-8 bg-[#F5F5F5] border border-black rounded mr-3 flex items-center justify-center"
            animate={{ rotate: isHovered ? 360 : 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <span className="text-xs">{project.title.charAt(0)}</span>
          </motion.div>
          <h3 className="font-semibold flex-1">{project.title}</h3>
        </div>

        <p className="text-sm text-[#555555] mb-4">{project.tagline}</p>

        <div className="flex flex-wrap gap-1">
          {project.tech.map((tech, index) => (
            <motion.span
              key={tech}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: isHovered ? index * 0.05 : 0, duration: 0.2 }}
              className="text-xs px-2 py-1 bg-[#F5F5F5] border border-black rounded hover:bg-[#08451b] hover:text-white transition-colors"
            >
              {tech}
            </motion.span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
