"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function VH_Demo() {
  const [selectedBand, setSelectedBand] = useState("all")

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <h3 className="text-xl font-bold">Geographic Distribution</h3>

        <Select value={selectedBand} onValueChange={setSelectedBand} disabled>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select age band" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ages</SelectItem>
            <SelectItem value="18-25">18-25</SelectItem>
            <SelectItem value="26-40">26-40</SelectItem>
            <SelectItem value="41-65">41-65</SelectItem>
            <SelectItem value="65+">65+</SelectItem>
          </SelectContent>
        </Select>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 h-64 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="mb-2">🗺️ UK Map</div>
            <div className="text-sm">Regional hesitancy heatmap</div>
            <div className="text-xs mt-2">Animated region highlights</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold">Hesitancy Metrics</h3>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 h-80 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="mb-4">📊 Stacked Bar Chart</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between w-48">
                <span>Hesitant:</span>
                <span className="font-bold text-red-500">23%</span>
              </div>
              <div className="flex justify-between w-48">
                <span>Neutral:</span>
                <span className="font-bold text-yellow-500">31%</span>
              </div>
              <div className="flex justify-between w-48">
                <span>Confident:</span>
                <span className="font-bold text-green-500">46%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
