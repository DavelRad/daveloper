"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function PulseTeaser() {
  return (
    <div className="grid-container">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.15, type: "spring" }}
        className="col-span-12"
      >
        <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-200">
          <div className="flex flex-col lg:flex-row items-center justify-between">
            <div className="mb-6 lg:mb-0">
              <h2 className="text-3xl font-bold mb-2">Project Pulse ⚡</h2>
              <p className="text-gray-600">Live infrastructure monitoring</p>
            </div>

            <div className="flex items-center space-x-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#00FFCC]">43%</div>
                <div className="text-sm text-gray-600">CPU</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#FF6B6B]">1.2 GB</div>
                <div className="text-sm text-gray-600">Memory</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#FBBF24]">↑3</div>
                <div className="text-sm text-gray-600">Deploys</div>
              </div>

              <Link href="/pulse">
                <Button variant="outline" className="ml-4 bg-transparent">
                  View Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
