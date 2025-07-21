"use client"

import { useEffect } from "react"

export function useCursor() {
  useEffect(() => {
    const cursor = document.querySelector(".custom-cursor") as HTMLElement
    if (!cursor) return

    const moveCursor = (e: MouseEvent) => {
      cursor.style.left = e.clientX + "px"
      cursor.style.top = e.clientY + "px"
    }

    const handleMouseEnter = () => {
      cursor.style.transform = "translate(-50%, -50%) scale(2.5)"
    }

    const handleMouseLeave = () => {
      cursor.style.transform = "translate(-50%, -50%) scale(1)"
    }

    document.addEventListener("mousemove", moveCursor)

    const interactiveElements = document.querySelectorAll(".interactive")
    interactiveElements.forEach((el) => {
      el.addEventListener("mouseenter", handleMouseEnter)
      el.addEventListener("mouseleave", handleMouseLeave)
    })

    return () => {
      document.removeEventListener("mousemove", moveCursor)
      interactiveElements.forEach((el) => {
        el.removeEventListener("mouseenter", handleMouseEnter)
        el.removeEventListener("mouseleave", handleMouseLeave)
      })
    }
  }, [])
}
