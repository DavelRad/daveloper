"use client"

import { motion } from "framer-motion"
import { ProjectCard } from "./ProjectCard"

export const projects = [
  {
    slug: "vaccine-hesitancy",
    title: "Vaccine Hesitancy Platform",
    tagline: "Multi-modal public-health analytics",
    stack: ["Python", "uAgents", "Next.js", "Supabase", "Mapbox"],
    accent: "#FF6B6B",
    demoComponent: "VH_Demo",
  },
  {
    slug: "landdrop",
    title: "LandDrop",
    tagline: "Geospatial land-degradation insights",
    stack: ["FastAPI", "Azure", "uAgents", "Mapbox"],
    accent: "#22D3EE",
    demoComponent: "LandDrop_Demo",
  },
  {
    slug: "particle",
    title: "Particle",
    tagline: "Real-time environmental news crawler",
    stack: ["Docker", "Kubernetes", "React", "Python"],
    accent: "#FBBF24",
    demoComponent: "Particle_Demo",
  },
  {
    slug: "skola",
    title: "Skola",
    tagline: "Community-based learning for Indonesia",
    stack: ["NestJS", "Next.js", "Supabase", "Xendit"],
    accent: "#A855F7",
    demoComponent: "Skola_Demo",
  },
  {
    slug: "queueit",
    title: "QueueIt",
    tagline: "Location-based social queuing app",
    stack: ["Flutter", "Firebase", "Mapbox"],
    accent: "#34D399",
    demoComponent: "QueueIt_Demo",
  },
]

export function ShowcaseGrid() {
  return (
    <div className="grid-container">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.15, type: "spring" }}
        className="col-span-12 mb-16"
      >
        <h2 className="text-5xl font-black mb-4">Featured Projects</h2>
        <p className="text-xl text-gray-600">Agent-powered solutions for real-world challenges</p>
      </motion.div>

      <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {projects.map((project, index) => (
          <motion.div
            key={project.slug}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.15, type: "spring", delay: index * 0.1 }}
          >
            <ProjectCard project={project} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
