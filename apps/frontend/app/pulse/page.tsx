"use client"

import { motion } from "framer-motion"
import { StatsCard } from "../components/StatsCard"
import { LogStream } from "../components/LogStream"
import { Button } from "@/components/ui/button"

export default function PulsePage() {
  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="grid-container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, type: "spring" }}
          className="col-span-12 mb-16"
        >
          <h1 className="text-6xl font-black mb-4">Project Pulse ⚡</h1>
          <p className="text-xl text-gray-600 mb-8">Infrastructure showcase and monitoring dashboard</p>
          <Button disabled className="bg-gray-300 text-gray-500 cursor-not-allowed">
            Deploy to AWS (sandbox)
          </Button>
        </motion.div>

        <div className="col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, type: "spring", delay: 0.1 }}
          >
            <StatsCard title="CPU Usage" value="43%" trend="+2.1%" color="#00FFCC" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, type: "spring", delay: 0.2 }}
          >
            <StatsCard title="Memory" value="1.2 GB" trend="-0.3%" color="#FF6B6B" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, type: "spring", delay: 0.3 }}
          >
            <StatsCard title="Deployments" value="3" trend="↑ Today" color="#FBBF24" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, type: "spring", delay: 0.4 }}
            className="lg:row-span-2"
          >
            <LogStream />
          </motion.div>
        </div>
      </div>
    </div>
  )
}
