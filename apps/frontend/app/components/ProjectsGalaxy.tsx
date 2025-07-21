"use client"

import { useScroll, useTransform, motion } from "framer-motion"
import { useRef } from "react"
import { PlanetCard } from "./PlanetCard"

const planets = [
  { id: "vh", name: "Vaccine Hesitancy", tag: "Multimodal Analytics", color: "#FF6B6B" },
  { id: "ld", name: "LandDrop", tag: "Geospatial Insights", color: "#22D3EE" },
  { id: "pt", name: "Particle", tag: "News Crawler", color: "#FBBF24" },
  { id: "sk", name: "Skola", tag: "Community Learning", color: "#A855F7" },
  { id: "qu", name: "QueueIt", tag: "Social Queues", color: "#34D399" },
]

export function ProjectsGalaxy() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  })

  const x = useTransform(scrollYProgress, [0, 1], [0, -1500])

  return (
    <div ref={containerRef} className="h-[200vh] relative overflow-hidden">
      {/* Starfield background */}
      <div className="absolute inset-0 starfield opacity-30"></div>

      {/* Sticky container that pins the galaxy to viewport center */}
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <motion.div style={{ x }} className="flex items-center space-x-96 min-w-[3000px]">
          {/* Title section */}
          <div className="flex-shrink-0 w-96 text-center">
            <h2 className="text-5xl font-black mb-4 text-[#00FFCC]">PROJECT GALAXY</h2>
            <p className="text-xl opacity-75">Explore the universe of solutions</p>
          </div>

          {/* Galaxy center with orbiting planets */}
          <div className="flex-shrink-0 relative w-[800px] h-[800px] flex items-center justify-center">
            {/* Center pulsating orb */}
            <motion.div
              className="absolute w-24 h-24 bg-gradient-to-r from-[#00FFCC] to-[#FF6B6B] rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />

            {/* Orbiting planets */}
            {planets.map((planet, index) => {
              const angle = (index / planets.length) * 360
              const radius = 200 + index * 40

              return (
                <motion.div
                  key={planet.id}
                  className="absolute"
                  style={{
                    left: "50%",
                    top: "50%",
                  }}
                  animate={{
                    rotate: 360,
                  }}
                  transition={{
                    duration: 20 + index * 5,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                >
                  <div
                    style={{
                      transform: `translateX(${radius}px) translateY(-50%)`,
                    }}
                  >
                    <motion.div
                      animate={{
                        rotate: -360,
                      }}
                      transition={{
                        duration: 20 + index * 5,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      }}
                    >
                      <PlanetCard planet={planet} />
                    </motion.div>
                  </div>
                </motion.div>
              )
            })}

            {/* Orbit rings */}
            {planets.map((_, index) => {
              const radius = 200 + index * 40
              return (
                <div
                  key={index}
                  className="absolute border border-gray-700 rounded-full opacity-20"
                  style={{
                    width: radius * 2,
                    height: radius * 2,
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                />
              )
            })}
          </div>

          {/* End section */}
          <div className="flex-shrink-0 w-96 text-center">
            <h3 className="text-3xl font-bold mb-4">Ready to explore?</h3>
            <p className="text-lg opacity-75">Each planet represents a unique solution</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
