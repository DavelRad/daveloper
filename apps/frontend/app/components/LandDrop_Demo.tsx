"use client"

export function LandDrop_Demo() {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">Land Suitability Analysis</h3>

      <div className="relative">
        <div className="w-full h-96 bg-gray-900 rounded-lg flex items-center justify-center text-white">
          <div className="text-center">
            <div className="mb-2">🗺️ Mapbox Dark Theme</div>
            <div className="text-sm opacity-75">Geospatial heatmap overlay</div>
          </div>
        </div>

        <div className="absolute top-4 right-4 bg-white rounded-lg p-4 shadow-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">82%</div>
            <div className="text-sm text-gray-600">Suitability Score</div>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 bg-white/90 rounded-lg p-3 text-sm">
          <div className="font-medium">Analysis Parameters:</div>
          <div className="text-gray-600">Soil quality, Climate, Elevation</div>
        </div>
      </div>
    </div>
  )
}
