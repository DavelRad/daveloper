"use client"

import { useState } from "react"
import { ChatWindow } from "./ChatWindow"

export function ContactAndChat() {
  const [showChat, setShowChat] = useState(false)

  return (
    <div className="h-screen flex items-center justify-center p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-8xl font-black mb-8 text-[#00FFCC]">Let's Talk.</h2>

          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 border-2 border-[#00FFCC] rounded-lg flex items-center justify-center">
                <span className="text-[#00FFCC] text-xl">✉</span>
              </div>
              <div>
                <div className="text-lg font-bold">Email</div>
                <div className="text-[#00FFCC] interactive cursor-pointer">hello@daveloper.dev</div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 border-2 border-[#00FFCC] rounded-lg flex items-center justify-center">
                <span className="text-[#00FFCC] text-xl">🔗</span>
              </div>
              <div>
                <div className="text-lg font-bold">LinkedIn</div>
                <div className="text-[#00FFCC] interactive cursor-pointer">/in/daveloper</div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 border-2 border-[#00FFCC] rounded-lg flex items-center justify-center">
                <span className="text-[#00FFCC] text-xl">🐙</span>
              </div>
              <div>
                <div className="text-lg font-bold">GitHub</div>
                <div className="text-[#00FFCC] interactive cursor-pointer">/daveloper</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="glass-morph rounded-2xl p-6 w-full max-w-md">
            <div className="space-y-4 mb-6">
              <div className="flex justify-start">
                <div className="bg-gray-700 rounded-lg p-3 max-w-xs">
                  <div className="text-sm">
                    Hi! I'm Davel's AI assistant. What would you like to know about his work?
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="bg-[#00FFCC] text-[#070707] rounded-lg p-3 max-w-xs">
                  <div className="text-sm">Tell me about the agent-powered products</div>
                </div>
              </div>

              <div className="flex justify-start">
                <div className="bg-gray-700 rounded-lg p-3 max-w-xs">
                  <div className="text-sm">
                    I specialize in building intelligent systems that leverage multi-agent architectures, LangGraph
                    workflows, and real-time data processing. Each project demonstrates scalable AI solutions.
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowChat(true)}
              className="w-full px-6 py-3 bg-[#00FFCC] text-[#070707] font-bold rounded-lg neon-glow hover:scale-105 transition-all interactive"
            >
              Start Conversation
            </button>
          </div>
        </div>
      </div>

      {showChat && <ChatWindow onClose={() => setShowChat(false)} />}
    </div>
  )
}
