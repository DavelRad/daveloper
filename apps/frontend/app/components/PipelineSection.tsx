"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { PipelineFlow } from "./PipelineFlow"
import { LogStream } from "./LogStream"

export function PipelineSection() {
  const [isRunning, setIsRunning] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [source, setSource] = useState("BBC")

  const runScraper = async () => {
    // TODO: Connect to real pipeline API
    setIsRunning(true)
    setActiveStep(0)

    // Simulate pipeline progression
    const steps = 5
    for (let i = 0; i < steps; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      setActiveStep(i + 1)
    }

    setTimeout(() => {
      setIsRunning(false)
      setActiveStep(0)
    }, 2000)
  }

  return (
    <section id="pipeline" className="py-20">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <h2 className="text-2xl font-semibold uppercase mb-4">LIVE NEWS SCRAPER PIPELINE</h2>

          <p className="text-sm text-[#555555] mb-8 max-w-2xl">
            This is a real-time news processing pipeline built with NestJS, Redis, Python workers, and Perplexity AI.
            Watch as articles flow through each stage: API ingestion → queue management → content scraping → AI analysis
            → dual database storage. The entire system processes live news data and stores both raw content and
            structured metadata.
          </p>

          <div className="flex gap-4 mb-8">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="border border-black rounded-lg px-3 py-2 text-sm"
              disabled={isRunning}
            >
              <option value="BBC">BBC News</option>
              <option value="Reuters">Reuters</option>
              <option value="Guardian">The Guardian</option>
            </select>

            <Button
              onClick={runScraper}
              disabled={isRunning}
              variant="outline"
              className="border-black hover:bg-black hover:text-white bg-transparent"
            >
              {isRunning ? "Processing..." : "RUN PIPELINE"}
            </Button>
          </div>

          {/* 3D Pipeline Flow */}
          <div className="mb-8">
            <PipelineFlow activeStep={activeStep} isRunning={isRunning} source={source} />
          </div>

          {/* Live Logs */}
          <LogStream isActive={isRunning} />
        </motion.div>
      </div>
    </section>
  )
}
