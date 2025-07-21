"use client"

import { LogStream } from "./LogStream"

export function Particle_Demo() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">News Crawler Status</h3>
        <div className="flex space-x-2">
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Scraped ✓</span>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Analyzed ✓</span>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Posted ✓</span>
        </div>
      </div>

      <LogStream />
    </div>
  )
}
