"use client"

import { useScroll, useTransform, motion } from "framer-motion"
import { useRef } from "react"
import { StatsWidget } from "./StatsWidget"
import { LogStream } from "./LogStream"

export function LivePulse() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0])

  return (
    <div ref={containerRef} className="h-[200vh] relative">
      <motion.div style={{ opacity }} className="sticky top-0 h-screen flex items-center justify-center">
        <div className="max-w-6xl mx-auto p-8">
          <div className="glass-morph rounded-2xl p-8">
            <h2 className="text-5xl font-black mb-8 text-center text-[#00FFCC]">LIVE PULSE</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <StatsWidget title="CPU Usage" value={43} unit="%" color="#00FFCC" scrollProgress={scrollYProgress} />
              <StatsWidget title="Memory" value={1.2} unit="GB" color="#FF6B6B" scrollProgress={scrollYProgress} />
              <StatsWidget title="Deploys" value={7} unit="" color="#FBBF24" scrollProgress={scrollYProgress} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <LogStream />

              <div className="flex items-center justify-center">
                <motion.button
                  whileHover={{ scale: 1.05, x: [0, -5, 5, -5, 5, 0] }}
                  transition={{ duration: 0.5 }}
                  disabled
                  className="px-8 py-4 bg-gray-600 text-gray-400 rounded-lg font-bold cursor-not-allowed interactive"
                >
                  Deploy to AWS (sandbox)
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
