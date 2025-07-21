"use client"

import { useState } from "react"
import { motion } from "framer-motion"

const logs = [
  "Initializing crypto price tracker...",
  "Connecting to CoinGecko API...",
  "✓ API connection established",
  "Fetching BTC, ETH, ADA prices...",
  "✓ Price data retrieved",
  "Processing market data...",
  "✓ Data processed successfully",
  "Storing in database...",
  "✓ Job completed successfully",
]

export function StackDropConsole() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [isDeploying, setIsDeploying] = useState(false)
  const [visibleLogs, setVisibleLogs] = useState<string[]>([])
  const [showApiDash, setShowApiDash] = useState(false)

  const handleAuth = () => {
    // TODO: Connect to real GitHub/Supabase auth
    setIsAuthenticated(true)
  }

  const handleDeploy = (template: string) => {
    // TODO: Connect to real deployment pipeline
    setSelectedTemplate(template)
    setIsDeploying(true)
    setVisibleLogs([])

    // Simulate log streaming
    logs.forEach((log, index) => {
      setTimeout(() => {
        setVisibleLogs((prev) => [...prev, log])
        if (index === logs.length - 1) {
          setTimeout(() => {
            setIsDeploying(false)
            setShowApiDash(true)
          }, 1000)
        }
      }, index * 800)
    })
  }

  const copyApiKey = () => {
    // TODO: Copy real API key to clipboard
    navigator.clipboard.writeText("sk_live_abc123xyz789")
  }

  return (
    <div className="h-screen flex items-center justify-center p-8 overflow-x-auto">
      <div className="flex space-x-8 min-w-max">
        {/* 1. Auth Widget */}
        <motion.div
          className="glass-morph rounded-xl p-6 w-80 relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-xl font-bold mb-4 text-[#00FFCC]">Authentication</h3>

          {!isAuthenticated ? (
            <div className="space-y-4">
              <button
                onClick={handleAuth}
                className="w-full flex items-center justify-center space-x-3 bg-gray-800 hover:bg-gray-700 p-3 rounded-lg transition-all interactive"
              >
                <span className="text-2xl">🐙</span>
                <span>Login with GitHub</span>
              </button>
              <button
                onClick={handleAuth}
                className="w-full flex items-center justify-center space-x-3 bg-green-800 hover:bg-green-700 p-3 rounded-lg transition-all interactive"
              >
                <span className="text-2xl">⚡</span>
                <span>Login with Supabase</span>
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-[#00FFCC] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✓</span>
              </div>
              <p className="text-[#00FFCC]">Authenticated</p>
            </div>
          )}

          {/* Connection line */}
          {isAuthenticated && (
            <motion.div
              className="absolute -right-4 top-1/2 w-8 h-0.5 bg-[#00FFCC]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </motion.div>

        {/* 2. Pipeline Configurator */}
        <motion.div
          className={`glass-morph rounded-xl p-6 w-80 relative ${!isAuthenticated ? "opacity-50" : ""}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-xl font-bold mb-4 text-[#00FFCC]">Pipeline Templates</h3>

          <div className="space-y-3">
            {[
              { id: "crypto", name: "Crypto Price Tracker", icon: "₿" },
              { id: "reddit", name: "Reddit Scraper", icon: "🤖" },
              { id: "csv", name: "CSV to API", icon: "📊" },
            ].map((template) => (
              <button
                key={template.id}
                onClick={() => isAuthenticated && handleDeploy(template.id)}
                disabled={!isAuthenticated}
                className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all interactive disabled:cursor-not-allowed"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{template.icon}</span>
                  <span className="text-sm">{template.name}</span>
                </div>
                <span className="text-xs text-[#00FFCC]">Deploy</span>
              </button>
            ))}
          </div>

          {/* Connection line */}
          {selectedTemplate && (
            <motion.div
              className="absolute -right-4 top-1/2 w-8 h-0.5 bg-[#00FFCC]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </motion.div>

        {/* 3. Worker & Job Logs */}
        <motion.div
          className={`glass-morph rounded-xl p-6 w-96 relative ${!selectedTemplate ? "opacity-50" : ""}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#00FFCC]">Worker Logs</h3>
            {isDeploying && (
              <motion.div
                className="w-4 h-4 border-2 border-[#00FFCC] border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              />
            )}
          </div>

          <div className="bg-[#0a0a0a] rounded-lg p-4 h-48 overflow-y-auto font-mono text-sm">
            {visibleLogs.map((log, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="text-[#00FFCC] mb-1"
              >
                {log}
              </motion.div>
            ))}
            {isDeploying && (
              <motion.div
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY }}
                className="text-[#00FFCC]"
              >
                ▋
              </motion.div>
            )}
          </div>

          {/* Connection line */}
          {showApiDash && (
            <motion.div
              className="absolute -right-4 top-1/2 w-8 h-0.5 bg-[#00FFCC]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </motion.div>

        {/* 4. API Dashboard */}
        <motion.div
          className={`glass-morph rounded-xl p-6 w-80 ${!showApiDash ? "opacity-50" : ""}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-xl font-bold mb-4 text-[#00FFCC]">API Dashboard</h3>

          {showApiDash ? (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Endpoint</div>
                <div className="text-sm font-mono">/api/userdata/crypto</div>
              </div>

              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">API Key</div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-mono">sk_live_abc123...</div>
                  <button onClick={copyApiKey} className="text-xs text-[#00FFCC] hover:underline interactive">
                    Copy
                  </button>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Rate Limit</div>
                <div className="text-sm">1000 req/hour</div>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                  <div className="bg-[#00FFCC] h-2 rounded-full w-1/4"></div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl mb-2">🚀</div>
                <div className="text-sm text-[#00FFCC]">API Ready!</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4 opacity-50">⏳</div>
              <div className="text-sm opacity-50">Waiting for deployment...</div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
