"use client"

import { SkillChip } from "./SkillChip"
import { mockSkills } from "../lib/mockSkills"

export function SkillStrip() {
  return (
    <section className="py-20 px-6 md:px-12 lg:px-24">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16">Skills</h2>

        <div className="overflow-x-auto">
          <div className="flex space-x-6 pb-4 scroll-snap-x">
            {mockSkills.map((skill, index) => (
              <div key={index} className="flex-shrink-0 scroll-snap-start">
                <SkillChip skill={skill} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
