"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { LogStream } from "./LogStream"

const steps = [
  { title: "NestJS API", description: "Request accepted", icon: "🚀" },
  { title: "Redis Queue", description: "Job queued (id: abc123)", icon: "📋" },
  { title: "Python Worker", description: "Scraping… analysing w/ Perplexity AI", icon: "🐍" },
  { title: "Data Stores", description: "Saved to MongoDB + PostgreSQL", icon: "💾" },
]

export function PipelineBlock() {
  const [isRunning, setIsRunning] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [source, setSource] = useState("BBC")

  const runScraper = async () => {
    // TODO: Connect to real pipeline API
    setIsRunning(true)
    setActiveStep(0)

    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setActiveStep(i + 1)
    }

    setTimeout(() => {
      setIsRunning(false)
    }, 2000)
  }

  return (
    <section id="playground" className="py-20 px-6 md:px-12 lg:px-24 scroll-mt-[100px]">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-white rounded-lg shadow-sm p-8"
        >
          <h2 className="text-2xl font-bold mb-6">News Scraper Pipeline</h2>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full p-2 border border-[#E5E7EB] rounded-lg"
              disabled={isRunning}
            >
              <option value="BBC">BBC</option>
              <option value="Reuters">Reuters</option>
              <option value="Guardian">Guardian</option>
            </select>
          </div>

          <Button onClick={runScraper} disabled={isRunning} className="mb-8 bg-[#6366F1] hover:bg-[#5855EB]">
            {isRunning ? "Running..." : "Run Scraper"}
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0.3 }}
                animate={{
                  opacity: activeStep > index ? 1 : 0.3,
                }}
                transition={{ duration: 0.2 }}
                className={`p-4 rounded-lg border ${
                  activeStep > index ? "border-[#6366F1] bg-blue-50" : "border-[#E5E7EB]"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{step.icon}</span>
                  <div>
                    <div className="font-medium">{step.title}</div>
                    <div className="text-sm text-gray-600">{step.description}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <LogStream isActive={isRunning} />
        </motion.div>
      </div>
    </section>
  )
}
