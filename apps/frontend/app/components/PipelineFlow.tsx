"use client"

import { motion } from "framer-motion"
import { Server, Database, Cpu, Brain, Archive } from "lucide-react"

interface PipelineFlowProps {
  activeStep: number
  isRunning: boolean
  source: string
}

const steps = [
  {
    id: 1,
    title: "NestJS API",
    subtitle: "Request Handler",
    icon: Server,
    color: "#3B82F6",
  },
  {
    id: 2,
    title: "Redis Queue",
    subtitle: "Job Management",
    icon: Database,
    color: "#EF4444",
  },
  {
    id: 3,
    title: "Python Worker",
    subtitle: "Content Scraper",
    icon: Cpu,
    color: "#F59E0B",
  },
  {
    id: 4,
    title: "Perplexity AI",
    subtitle: "Content Analysis",
    icon: Brain,
    color: "#8B5CF6",
  },
  {
    id: 5,
    title: "Data Storage",
    subtitle: "MongoDB + PostgreSQL",
    icon: Archive,
    color: "#10B981",
  },
]

export function PipelineFlow({ activeStep, isRunning, source }: PipelineFlowProps) {
  return (
    <div className="relative bg-[#F8F9FA] border border-black rounded-lg p-8 overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="grid grid-cols-12 grid-rows-8 h-full w-full">
          {Array.from({ length: 96 }).map((_, i) => (
            <div key={i} className="border border-gray-400" />
          ))}
        </div>
      </div>

      {/* Source Indicator */}
      <div className="absolute top-4 right-4 bg-white border border-black rounded px-3 py-1 text-xs font-mono">
        SOURCE: {source}
      </div>

      {/* Pipeline Steps */}
      <div className="relative z-10 flex justify-between items-center">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = activeStep >= step.id
          const isCurrent = activeStep === step.id && isRunning

          return (
            <div key={step.id} className="flex flex-col items-center">
              {/* Step Node */}
              <motion.div
                className="relative"
                animate={{
                  scale: isCurrent ? [1, 1.1, 1] : 1,
                }}
                transition={{
                  duration: 1,
                  repeat: isCurrent ? Number.POSITIVE_INFINITY : 0,
                }}
              >
                <div
                  className={`w-16 h-16 rounded-lg border-2 flex items-center justify-center transition-all duration-500 ${
                    isActive ? "border-black shadow-lg" : "border-gray-300"
                  }`}
                  style={{
                    backgroundColor: isActive ? step.color : "#ffffff",
                    transform: isActive ? "translateY(-4px)" : "translateY(0)",
                  }}
                >
                  <Icon
                    className={`w-6 h-6 transition-colors duration-500 ${isActive ? "text-white" : "text-gray-400"}`}
                  />
                </div>

                {/* Processing Indicator */}
                {isCurrent && (
                  <motion.div
                    className="absolute -top-2 -right-2 w-4 h-4 bg-[#08451b] rounded-full"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [1, 0.7, 1],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                  />
                )}
              </motion.div>

              {/* Step Info */}
              <div className="mt-4 text-center">
                <div
                  className={`text-sm font-semibold transition-colors duration-500 ${
                    isActive ? "text-black" : "text-gray-400"
                  }`}
                >
                  {step.title}
                </div>
                <div
                  className={`text-xs transition-colors duration-500 ${isActive ? "text-[#555555]" : "text-gray-400"}`}
                >
                  {step.subtitle}
                </div>
              </div>

              {/* Connection Line */}
              {index < steps.length - 1 && (
                <div className="absolute top-8 left-16 w-16 h-0.5 bg-gray-300">
                  <motion.div
                    className="h-full bg-[#08451b]"
                    initial={{ width: 0 }}
                    animate={{
                      width: activeStep > step.id ? "100%" : "0%",
                    }}
                    transition={{ duration: 0.5 }}
                  />

                  {/* Data Flow Animation */}
                  {isRunning && activeStep > step.id && (
                    <motion.div
                      className="absolute top-0 w-2 h-0.5 bg-[#08451b] rounded-full"
                      animate={{
                        x: [0, 64, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Status Messages */}
      <div className="mt-8 text-center">
        {isRunning ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-[#08451b] font-mono">
            {activeStep === 1 && "Receiving scrape request..."}
            {activeStep === 2 && "Queuing job for processing..."}
            {activeStep === 3 && "Scraping articles from source..."}
            {activeStep === 4 && "Analyzing content with AI..."}
            {activeStep === 5 && "Storing processed data..."}
          </motion.div>
        ) : (
          <div className="text-sm text-[#555555]">Pipeline ready • Click "RUN PIPELINE" to process live news data</div>
        )}
      </div>
    </div>
  )
}
