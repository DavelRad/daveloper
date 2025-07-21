"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import { ChatWindow } from "../components/ChatWindow"
import { Button } from "@/components/ui/button"

export default function ChatPage() {
  const [showDiagram, setShowDiagram] = useState(false)

  return (
    <div className="min-h-screen pt-32 pb-20">
      <div className="grid-container">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, type: "spring" }}
          className="col-span-12 mb-8"
        >
          <h1 className="text-6xl font-black mb-4">Chat with me</h1>
          <p className="text-xl text-gray-600">Powered by LangGraph and vector embeddings</p>
        </motion.div>

        <div className="col-span-12 lg:col-span-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, type: "spring", delay: 0.1 }}
          >
            <ChatWindow onClose={() => {}} />
          </motion.div>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, type: "spring", delay: 0.2 }}
            className="bg-white rounded-2xl p-6 shadow-lg"
          >
            <Button onClick={() => setShowDiagram(!showDiagram)} className="w-full mb-4" variant="outline">
              {showDiagram ? "Hide" : "Show"} How it's built
            </Button>

            {showDiagram && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <div className="text-gray-500">
                  <div className="mb-4">📊 LangGraph Flow</div>
                  <div className="mb-4">🔍 Vector Database</div>
                  <div className="mb-4">🤖 Agent Orchestration</div>
                  <div className="text-sm">Architecture diagram placeholder</div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
