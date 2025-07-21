"use client"

import { motion } from "framer-motion"
import { ProjectCard } from "../components/ProjectCard"

const projects = [
  {
    id: "vaccine-hesitancy",
    title: "Vaccine Hesitancy Platform",
    tagline: "Multi-modal public-health analytics",
    tech: ["Python", "uAgents", "Next.js", "Supabase", "Mapbox"],
    logo: "/logos/vaccine-logo.png",
  },
  {
    id: "landdrop",
    title: "LandDrop",
    tagline: "Geospatial land-degradation insights",
    tech: ["FastAPI", "Azure", "uAgents", "Mapbox"],
    logo: "/logos/landdrop-logo.png",
  },
  {
    id: "particle",
    title: "Particle",
    tagline: "Real-time environmental news crawler",
    tech: ["Docker", "Kubernetes", "React", "Python"],
    logo: "/logos/particle-logo.png",
  },
  {
    id: "skola",
    title: "Skola",
    tagline: "Community-based learning for Indonesia",
    tech: ["NestJS", "Next.js", "Supabase", "Xendit"],
    logo: "/logos/skola-logo.png",
  },
  {
    id: "queueit",
    title: "QueueIt",
    tagline: "Location-based social queuing app",
    tech: ["Flutter", "Firebase", "Mapbox"],
    logo: "/logos/queueit-logo.png",
  },
]

export default function ShowcasePage() {
  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="grid-container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, type: "spring" }}
          className="col-span-12 mb-16"
        >
          <h1 className="text-6xl font-black mb-4">Showcase</h1>
          <p className="text-xl text-gray-600">A collection of agent-powered products and platforms</p>
        </motion.div>

        <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, type: "spring", delay: index * 0.1 }}
            >
              <ProjectCard project={project} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
