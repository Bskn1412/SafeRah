"use client"

import React from "react"
import { AnimatedCounter } from "./AnimatedCounter"
import { ScrollReveal } from "./ScrollReveal"
import { Lock } from "lucide-react"
import { InteractiveCard } from "./InteractiveCard"

export function StatsSection() {
  const stats = [
    { value: 100, label: "Petabytes Encrypted", suffix: "+" },
    { value: 500, label: "Thousand Users", suffix: "K+" },
    { value: 99, label: "Uptime Guarantee", suffix: ".99%" },
    { value: 256, label: "Bit Encryption", suffix: "-bit" },
  ]

  return (
    <section
      id="stats"
      className="relative px-4 sm:px-6 lg:px-8 py-14 sm:py-16 md:py-20 max-w-7xl mx-auto"
    >
      <ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-center">

          {/* LEFT — Lock Card */}
          <ScrollReveal>
            <InteractiveCard>
              <div className="relative h-64 sm:h-80 md:h-96 rounded-2xl border border-border/20 
                              bg-gradient-to-b from-secondary/10 to-primary/5 flex items-center 
                              justify-center overflow-hidden transition-all duration-300 
                              hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20 group">
                
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 
                                via-transparent to-secondary/20 transition-all duration-300 
                                group-hover:from-primary/30">
                </div>

                <div className="relative text-center space-y-3 sm:space-y-4">
                  <Lock className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto text-primary opacity-50 
                                   group-hover:opacity-100 group-hover:scale-110 
                                   transition-all duration-300" />
                  <p className="text-sm sm:text-base text-foreground/60 group-hover:text-foreground transition-colors">
                    Encrypted File Vault
                  </p>
                </div>
              </div>
            </InteractiveCard>
          </ScrollReveal>

          {/* RIGHT — Stats */}
          <ScrollReveal>
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {stats.map((stat) => (
                <ScrollReveal key={stat.value}>
                  <InteractiveCard>
                    <div className="text-center p-4 sm:p-5 md:p-6 rounded-xl border border-border/40 
                                    bg-card/50 transition-all duration-300 
                                    hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 group">
                      
                      <div className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r 
                                      from-primary to-secondary bg-clip-text text-transparent mb-1 
                                      transition-all duration-300 group-hover:scale-105">
                        <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                      </div>

                      <p className="text-xs sm:text-sm md:text-base text-foreground/70">
                        {stat.label}
                      </p>

                    </div>
                  </InteractiveCard>
                </ScrollReveal>
              ))}
            </div>
          </ScrollReveal>

        </div>
      </ScrollReveal>
    </section>
  )
}