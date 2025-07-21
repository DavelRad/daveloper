"use client"

import { useState } from "react"
import { ChatWindow } from "./ChatWindow"

export function NavBar() {
  const [showChat, setShowChat] = useState(false)

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 p-6">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div
            className="text-2xl font-black text-[#00FFCC] interactive cursor-pointer"
            onClick={() => scrollToSection("intro")}
          >
            DAVELOPER.DEV
          </div>

          <div className="flex space-x-8">
            <button
              className="interactive hover:text-[#00FFCC] transition-colors"
              onClick={() => scrollToSection("projects")}
            >
              Galaxy
            </button>
            <button
              className="interactive hover:text-[#00FFCC] transition-colors"
              onClick={() => scrollToSection("console")}
            >
              Console
            </button>
            <button
              className="interactive hover:text-[#00FFCC] transition-colors"
              onClick={() => scrollToSection("skills")}
            >
              Skills
            </button>
            <button className="interactive hover:text-[#00FFCC] transition-colors" onClick={() => setShowChat(true)}>
              Chat
            </button>
          </div>
        </div>
      </nav>

      {showChat && <ChatWindow onClose={() => setShowChat(false)} />}
    </>
  )
}
