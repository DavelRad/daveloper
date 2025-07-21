import type React from "react"
import type { Metadata } from "next"
import { IBM_Plex_Serif, JetBrains_Mono } from "next/font/google"
import { CustomCursor } from "./components/CustomCursor"
import "./globals.css"

const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-ibm-plex-serif",
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-jetbrains-mono",
})

export const metadata: Metadata = {
  title: "Davel Radindra - Portfolio",
  description: "Building fast, learning faster — infrastructure, apps, & everything between.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${ibmPlexSerif.variable} ${jetBrainsMono.variable}`}>
      <body className="font-serif bg-white text-black antialiased">
        {children}
      </body>
    </html>
  )
}
