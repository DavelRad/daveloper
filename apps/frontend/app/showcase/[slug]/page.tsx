"use client"

import { motion } from "framer-motion"
import { use } from "react"
import { ProjectHero } from "../../components/ProjectHero"
import { VH_Demo } from "../../components/VH_Demo"
import { LandDrop_Demo } from "../../components/LandDrop_Demo"
import { Particle_Demo } from "../../components/Particle_Demo"
import { Skola_Demo } from "../../components/Skola_Demo"
import { QueueIt_Demo } from "../../components/QueueIt_Demo"

const projects = {
  "vaccine-hesitancy": {
    title: "Vaccine Hesitancy Platform",
    tagline: "Multi-modal public-health analytics",
    description:
      "A comprehensive platform analyzing vaccine hesitancy patterns across demographics using multi-agent systems and real-time data processing.",
    stack: ["Python", "uAgents", "Next.js", "Supabase", "Mapbox"],
    accent: "#FF6B6B",
    demoComponent: "VH_Demo",
  },
  landdrop: {
    title: "LandDrop",
    tagline: "Geospatial land-degradation insights",
    description:
      "AI-powered geospatial analysis platform providing real-time insights into land degradation patterns and environmental impact assessment.",
    stack: ["FastAPI", "Azure", "uAgents", "Mapbox"],
    accent: "#22D3EE",
    demoComponent: "LandDrop_Demo",
  },
  particle: {
    title: "Particle",
    tagline: "Real-time environmental news crawler",
    description:
      "Distributed news aggregation system with intelligent content analysis and real-time environmental impact scoring.",
    stack: ["Docker", "Kubernetes", "React", "Python"],
    accent: "#FBBF24",
    demoComponent: "Particle_Demo",
  },
  skola: {
    title: "Skola",
    tagline: "Community-based learning for Indonesia",
    description:
      "Educational platform connecting Indonesian communities through collaborative learning experiences and localized content delivery.",
    stack: ["NestJS", "Next.js", "Supabase", "Xendit"],
    accent: "#A855F7",
    demoComponent: "Skola_Demo",
  },
  queueit: {
    title: "QueueIt",
    tagline: "Location-based social queuing app",
    description:
      "Smart queuing application using real-time location data to optimize wait times and enhance social dining experiences.",
    stack: ["Flutter", "Firebase", "Mapbox"],
    accent: "#34D399",
    demoComponent: "QueueIt_Demo",
  },
}

const demoComponents = {
  VH_Demo,
  LandDrop_Demo,
  Particle_Demo,
  Skola_Demo,
  QueueIt_Demo,
}

export default function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const project = projects[slug as keyof typeof projects]

  if (!project) {
    return <div>Project not found</div>
  }

  const DemoComponent = demoComponents[project.demoComponent as keyof typeof demoComponents]

  return (
    <div className="min-h-screen pt-32 pb-20">
      <ProjectHero project={project} />

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.15, type: "spring" }}
        className="py-20"
      >
        <div className="grid-container">
          <div className="col-span-12">
            <h2 className="text-3xl font-bold mb-8">Live Demo</h2>
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <DemoComponent />
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  )
}
