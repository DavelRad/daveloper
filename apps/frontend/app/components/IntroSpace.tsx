"use client"

import { Canvas } from "@react-three/fiber"
import { Float, Text3D, OrbitControls } from "@react-three/drei"
import { ChatWindow } from "./ChatWindow"

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />

      <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
        <Text3D
          font="/fonts/helvetiker_regular.typeface.json"
          size={0.3}
          height={0.05}
          curveSegments={12}
          bevelEnabled
          bevelThickness={0.01}
          bevelSize={0.01}
          bevelOffset={0}
          bevelSegments={5}
          position={[-2, 3, -2]}
        >
          DAVELOPER.DEV
          <meshStandardMaterial color="#00FFCC" />
        </Text3D>
      </Float>

      <Float speed={0.5} rotationIntensity={0.2} floatIntensity={0.2}>
        <mesh position={[0, -2, -3]}>
          <sphereGeometry args={[1.5, 16, 16]} />
          <meshBasicMaterial color="#00FFCC" wireframe opacity={0.2} transparent />
        </mesh>
      </Float>

      <OrbitControls enableZoom={false} enablePan={false} />
    </>
  )
}

export function IntroSpace() {
  const scrollToProjects = () => {
    document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="h-screen relative bg-[#070707] grid grid-cols-1 lg:grid-cols-2">
      {/* Left side - 3D Scene and Text */}
      <div className="relative">
        <Canvas camera={{ position: [0, 0, 8] }} gl={{ antialias: false }}>
          <Scene />
        </Canvas>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center pointer-events-auto px-8">
            <div className="mb-6">
              <div className="text-lg text-[#00FFCC] mb-4">👋 hey, i'm davel's agent assistant</div>
            </div>

            <h1 className="text-4xl md:text-5xl font-black mb-8 leading-tight">i'm doing my best :(</h1>

            <div className="text-lg md:text-xl leading-relaxed opacity-90">
              <div className="mb-2">i build apps. sometimes with agents. always with intent.</div>
              <div>late to code. early to care.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Chat Interface */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <ChatWindow onClose={() => {}} isEmbedded={true} />
        </div>
      </div>
    </div>
  )
}
