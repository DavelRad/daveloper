"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

export function InteractiveBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      })
    }

    document.addEventListener("mousemove", updateMousePosition)
    return () => document.removeEventListener("mousemove", updateMousePosition)
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Subtle gradient that follows mouse */}
      <motion.div
        className="absolute w-96 h-96 rounded-full opacity-5"
        style={{
          background: "radial-gradient(circle, #08451b 0%, transparent 70%)",
        }}
        animate={{
          x: mousePosition.x * 4,
          y: mousePosition.y * 4,
        }}
        transition={{
          type: "spring",
          stiffness: 50,
          damping: 20,
        }}
      />

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />
      </div>
    </div>
  )
}
