"use client"

import { useState, useEffect } from "react"
import { mockLogs } from "../lib/mockLogs"

interface LogStreamProps {
  isActive: boolean
}

export function LogStream({ isActive }: LogStreamProps) {
  const [visibleLogs, setVisibleLogs] = useState<string[]>([])

  useEffect(() => {
    if (!isActive) {
      setVisibleLogs([])
      return
    }

    // TODO: Connect to real WebSocket for live logs
    let logIndex = 0
    const interval = setInterval(() => {
      if (logIndex < mockLogs.length) {
        setVisibleLogs((prev) => [...prev, mockLogs[logIndex]])
        logIndex++
      } else {
        clearInterval(interval)
      }
    }, 400)

    return () => clearInterval(interval)
  }, [isActive])

  return (
    <div className="bg-[#F5F5F5] border border-black rounded-lg p-4 h-48 overflow-y-auto font-mono text-xs">
      <div className="mb-2 text-[#555555]">Pipeline Logs:</div>
      {visibleLogs.map((log, index) => (
        <div key={index} className="mb-1">
          <span className="text-[#555555]">[{new Date().toLocaleTimeString()}]</span> {log}
        </div>
      ))}
      {isActive && (
        <div className="animate-pulse">
          <span className="text-[#555555]">[{new Date().toLocaleTimeString()}]</span> Processing...
        </div>
      )}
    </div>
  )
}
