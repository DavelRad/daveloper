"use client"

import { motion } from "framer-motion"
import { SkillChip } from "./SkillChip"

const portfolioStack = [
  {
    name: "Next.js 14",
    type: "code" as const,
    content: "React framework with App Router",
  },
  {
    name: "Framer Motion",
    type: "gif" as const,
    content: "Smooth animations and transitions",
  },
  {
    name: "Tailwind CSS",
    type: "screenshot" as const,
    content: "Utility-first styling system",
  },
  {
    name: "TypeScript",
    type: "code" as const,
    content: "Type-safe development",
  },
  {
    name: "NestJS Pipeline",
    type: "terminal" as const,
    content: "Backend API for news scraper",
  },
  {
    name: "Redis Queue",
    type: "terminal" as const,
    content: "Job queue management",
  },
  {
    name: "Python Workers",
    type: "terminal" as const,
    content: "Content scraping workers",
  },
  {
    name: "Perplexity AI",
    type: "screenshot" as const,
    content: "AI-powered content analysis",
  },
  {
    name: "MongoDB",
    type: "code" as const,
    content: "Raw content storage",
  },
  {
    name: "PostgreSQL",
    type: "code" as const,
    content: "Structured metadata storage",
  },
]

export function SkillsSection() {
  return (
    <section id="skills" className="py-20">
      <div className="mx-auto max-w-3xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="text-2xl font-semibold uppercase mb-8"
        >
          PORTFOLIO TECH STACK
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.2, ease: "easeOut", delay: 0.1 }}
          className="text-sm text-[#555555] mb-12"
        >
          This portfolio and the live news scraper demo are built with a modern full-stack architecture. Frontend uses
          Next.js with Framer Motion for smooth interactions, while the backend pipeline combines NestJS, Redis, Python
          workers, and AI analysis for real-time data processing.
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portfolioStack.map((skill, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.2, ease: "easeOut", delay: index * 0.05 }}
            >
              <SkillChip skill={skill} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
