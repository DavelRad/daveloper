"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

const commands = [
  { label: "Home", href: "/", keywords: ["home", "main"] },
  { label: "Showcase", href: "/showcase", keywords: ["projects", "portfolio"] },
  { label: "Vaccine Hesitancy Platform", href: "/showcase/vaccine-hesitancy", keywords: ["vaccine", "health"] },
  { label: "LandDrop", href: "/showcase/landdrop", keywords: ["land", "geospatial"] },
  { label: "Particle", href: "/showcase/particle", keywords: ["news", "crawler"] },
  { label: "Skola", href: "/showcase/skola", keywords: ["education", "learning"] },
  { label: "QueueIt", href: "/showcase/queueit", keywords: ["queue", "social"] },
  { label: "Pulse", href: "/pulse", keywords: ["infrastructure", "monitoring"] },
  { label: "Skills", href: "/skills", keywords: ["skills", "tech"] },
  { label: "Chat", href: "/chat", keywords: ["chat", "ai"] },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(true)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const filteredCommands = commands.filter(
    (command) =>
      command.label.toLowerCase().includes(search.toLowerCase()) ||
      command.keywords.some((keyword) => keyword.includes(search.toLowerCase())),
  )

  const handleSelect = (href: string) => {
    setOpen(false)
    setSearch("")
    router.push(href)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg p-0">
        <div className="border-b border-gray-200">
          <Input
            placeholder="Search commands... (⌘K)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 focus-visible:ring-0 text-lg p-4"
            autoFocus
          />
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.map((command) => (
            <button
              key={command.href}
              onClick={() => handleSelect(command.href)}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {command.label}
            </button>
          ))}

          {filteredCommands.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500">No commands found</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
