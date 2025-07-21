"use client"

import { useState } from "react"
import { motion } from "framer-motion"

interface ChatWindowProps {
  onClose: () => void
  isEmbedded?: boolean
}

const mockMessages = [
  {
    role: "assistant",
    content:
      "Hi! I'm Davel's AI assistant. Ask me about his projects, skills, or experience with agent-powered systems!",
  },
  { role: "user", content: "What makes your agent-powered products unique?" },
  {
    role: "assistant",
    content:
      "Great question! My products leverage multi-agent architectures with LangGraph for complex workflow orchestration. Each agent specializes in specific tasks - data processing, analysis, or user interaction - creating scalable, intelligent systems that adapt to real-world challenges.",
  },
]

export function ChatWindow({ onClose, isEmbedded = false }: ChatWindowProps) {
  const [messages, setMessages] = useState(mockMessages)
  const [input, setInput] = useState("")

  const handleSend = () => {
    if (!input.trim()) return

    // TODO: Connect to real LangGraph-powered backend
    setMessages((prev) => [
      ...prev,
      { role: "user", content: input },
      {
        role: "assistant",
        content:
          "This is a demo response. The production version will connect to a LangGraph agent system with vector embeddings and real-time processing capabilities.",
      },
    ])
    setInput("")
  }

  if (isEmbedded) {
    return (
      <div className="glass-morph rounded-2xl w-full h-96 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <h3 className="text-xl font-bold text-[#00FFCC]">Chat with me</h3>
          <div className="w-3 h-3 bg-[#00FFCC] rounded-full animate-pulse"></div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  message.role === "user" ? "bg-[#00FFCC] text-[#070707]" : "bg-gray-700 text-[#EAEAEA]"
                }`}
              >
                <div className="text-sm">{message.content}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-600">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about agent-powered systems..."
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-[#00FFCC]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSend()
                }
              }}
            />
            <button
              onClick={handleSend}
              className="px-6 py-2 bg-[#00FFCC] text-[#070707] font-bold rounded-lg hover:scale-105 transition-all interactive"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-morph rounded-2xl w-full max-w-2xl h-96 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <h3 className="text-xl font-bold text-[#00FFCC]">AI Assistant</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white interactive">
            ✕
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === "user" ? "bg-[#00FFCC] text-[#070707]" : "bg-gray-700 text-[#EAEAEA]"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-600">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about agent-powered systems..."
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-[#00FFCC]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSend()
                }
              }}
            />
            <button
              onClick={handleSend}
              className="px-6 py-2 bg-[#00FFCC] text-[#070707] font-bold rounded-lg hover:scale-105 transition-all interactive"
            >
              Send
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
