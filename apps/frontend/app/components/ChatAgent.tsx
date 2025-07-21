"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Bot } from "lucide-react"

const mockChat = [
  {
    question: "What's Davel's best project?",
    answer: "LandDrop – see below.",
  },
]

export function ChatAgent() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState(mockChat)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // TODO: Connect to RAG/Vector DB for real portfolio Q&A
    const newMessage = {
      question: input,
      answer: "This is a demo response. Production will use vector embeddings.",
    }

    setMessages([...messages, newMessage])
    setInput("")
  }

  return (
    <div className="border border-black rounded-lg p-4 w-full md:max-w-sm">
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-6 h-6 bg-[#08451b] rounded-full flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-xs uppercase tracking-wider">ASK MY PORTFOLIO</h3>
      </div>

      <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className="space-y-1">
            <div className="text-sm bg-[#F5F5F5] p-2 rounded border">Q: {msg.question}</div>
            <div className="text-sm p-2">A: {msg.answer}</div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything..."
          className="flex-1 border-black"
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          className="border-black hover:bg-[#08451b] hover:text-white bg-transparent hover:border-[#08451b] transition-colors"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  )
}
