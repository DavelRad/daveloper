"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Github, Linkedin, FileText } from "lucide-react"
import { ChatAgent } from "./ChatAgent"

const headlines = [
  "Currently interning @ Fetch.ai",
  "Built multi-agent systems for fun",
  "Hackathon win rate — 100%",
  "Solves a Rubik's cube < 10s",
  "Gym enjoyer & espresso addict",
  "I ❤️ my mom",
]

export function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [displayText, setDisplayText] = useState("")
  const [isTyping, setIsTyping] = useState(true)

  useEffect(() => {
    const currentHeadline = headlines[currentIndex]
    let charIndex = 0
    setDisplayText("")
    setIsTyping(true)

    const typeInterval = setInterval(() => {
      if (charIndex < currentHeadline.length) {
        setDisplayText(currentHeadline.slice(0, charIndex + 1))
        charIndex++
      } else {
        clearInterval(typeInterval)
        setIsTyping(false)

        // Wait 2 seconds before moving to next headline
        setTimeout(() => {
          setCurrentIndex((prev) => (prev + 1) % headlines.length)
        }, 2000)
      }
    }, 80)

    return () => clearInterval(typeInterval)
  }, [currentIndex])

  return (
    <section id="top" className="py-20">
      <div className="mx-auto max-w-3xl md:grid md:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div className="h-24 md:h-28 flex items-center mb-6">
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
              {displayText}
              {isTyping && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY }}
                  className="ml-1"
                >
                  |
                </motion.span>
              )}
            </h1>
          </div>
          <p className="text-sm opacity-70 mb-8">
            Building fast, learning faster — infrastructure, apps, & everything between.
          </p>

          {/* Social Links */}
          <div className="flex space-x-4">
            <motion.a
              href="https://github.com/DavelRad"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 border border-black rounded-lg hover:bg-black hover:text-white transition-colors"
            >
              <Github className="w-5 h-5" />
            </motion.a>
            <motion.a
              href="https://www.linkedin.com/in/davelradindra/"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 border border-black rounded-lg hover:bg-black hover:text-white transition-colors"
            >
              <Linkedin className="w-5 h-5" />
            </motion.a>
            <motion.a
              href="/OL-Davel-Resume-v3.pdf"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 border border-black rounded-lg hover:bg-black hover:text-white transition-colors"
            >
              <FileText className="w-5 h-5" />
            </motion.a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut", delay: 0.1 }}
        >
          <ChatAgent />
        </motion.div>
      </div>
    </section>
  )
}
