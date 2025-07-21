"use client"

import { motion } from "framer-motion"
import { TimelineItem } from "./TimelineItem"
import { StatsBox } from "./StatsBox"
import { mockTimeline } from "../lib/mockTimeline"
import { useState, useEffect } from "react"

export function TimelineSection() {
  const [activeTimelineIndex, setActiveTimelineIndex] = useState(0)

  useEffect(() => {
    const observers = mockTimeline.map((_, index) => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveTimelineIndex(index)
            }
          })
        },
        { threshold: 0.6 },
      )

      const element = document.getElementById(`timeline-${index}`)
      if (element) observer.observe(element)

      return observer
    })

    return () => {
      observers.forEach((observer) => observer.disconnect())
    }
  }, [])

  return (
    <section id="timeline" className="py-20">
      <div className="mx-auto max-w-5xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="text-2xl font-semibold uppercase mb-12"
        >
          LIFE PATH
        </motion.h2>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Timeline - Left 2/3 */}
          <div className="lg:col-span-2">
            <div className="relative">
              {/* Vertical connecting line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-black opacity-20"></div>

              <div className="space-y-12">
                {mockTimeline.map((item, index) => (
                  <div key={index} id={`timeline-${index}`} className="relative">
                    {/* Timeline dot */}
                    <motion.div
                      className="absolute left-3 top-8 w-2 h-2 rounded-full border border-black"
                      animate={{
                        backgroundColor: activeTimelineIndex === index ? "#08451b" : "transparent",
                      }}
                      transition={{ duration: 0.3 }}
                    />

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.2, ease: "easeOut", delay: index * 0.1 }}
                      className="ml-12"
                    >
                      <TimelineItem item={item} isActive={activeTimelineIndex === index} />
                    </motion.div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats Box - Right 1/3 */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <StatsBox activeIndex={activeTimelineIndex} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
