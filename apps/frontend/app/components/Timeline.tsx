"use client"

import { motion } from "framer-motion"
import { mockTimeline } from "../lib/mockTimeline"

export function Timeline() {
  return (
    <section id="timeline" className="py-20 px-6 md:px-12 lg:px-24 scroll-mt-[100px]">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="text-3xl font-bold text-center mb-16"
        >
          Timeline
        </motion.h2>

        <div className="space-y-8">
          {mockTimeline.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.2, ease: "easeOut", delay: index * 0.1 }}
              className="relative pl-8 border-l-2 border-[#E5E7EB]"
            >
              <div className="absolute -left-2 top-0 w-4 h-4 bg-[#6366F1] rounded-full"></div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="text-sm text-[#6366F1] font-semibold mb-2">{item.date}</div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
