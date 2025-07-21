import { Hero } from "./components/Hero"
import { TimelineSection } from "./components/TimelineSection"
import { ProjectsSection } from "./components/ProjectsSection"
import { PipelineSection } from "./components/PipelineSection"
import { SkillsSection } from "./components/SkillsSection"
import { Footer } from "./components/Footer"
import { FloatingElements } from "./components/FloatingElements"
import { InteractiveBackground } from "./components/InteractiveBackground"

export default function Home() {
  return (
    <div className="relative">
      <InteractiveBackground />
      <FloatingElements />
      <main className="relative z-10">
        <div className="px-6 md:px-12 xl:px-24">
          <Hero />
          <TimelineSection />
          <ProjectsSection />
          <PipelineSection />
          <SkillsSection />
          <Footer />
        </div>
      </main>
    </div>
  )
}
