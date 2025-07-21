"use client"

export function QueueIt_Demo() {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">Mobile Queue Interface</h3>

      <div className="flex justify-center">
        <div className="w-64 h-96 bg-gray-900 rounded-3xl p-4 shadow-2xl">
          <div className="w-full h-full bg-white rounded-2xl p-4 flex flex-col">
            <div className="flex-1 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
              <div className="text-center text-gray-600">
                <div className="mb-2">🗺️ Map View</div>
                <div className="text-xs">Queue pins: 📍📍📍</div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <span>🧑‍🤝‍🧑</span>
                <span className="font-bold">5 waiting</span>
              </div>
              <div className="text-sm text-gray-600">Taco Tuesday @ La Taqueria</div>
              <div className="text-xs text-gray-500 mt-1">Est. wait: 12 min</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
