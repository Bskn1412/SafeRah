"use client"

import React from "react"
import { ScrollReveal } from "./ScrollReveal"
import { Shield, ZapIcon, CheckCircle } from "lucide-react" // replace with actual icons
import { InteractiveCard } from "./InteractiveCard"

export function FeaturesSection() {
  const features = [
    {
      icon: Shield,
      title: "User File Protection",
      desc: "Your files are encrypted end-to-end using military-grade XChaCha20-Poly1305 encryption. Only you hold the keys.",
      features: ["XChaCha20-Poly1305 Encryption", "Zero-Knowledge Backend", "No Server Access"],
      colorClass: "from-primary/10 to-secondary/10",
      borderColor: "hover:border-primary/50",
      hoverShadow: "hover:shadow-primary/10",
    },
    {
      icon: ZapIcon,
      title: "Admin Transparency",
      desc: "Complete audit trails and admin proofs ensure transparency and accountability for all operations.",
      features: ["Complete Audit Trail", "Admin Proof System", "Transparent Operations"],
      colorClass: "from-secondary/10 to-primary/10",
      borderColor: "hover:border-secondary/50",
      hoverShadow: "hover:shadow-secondary/10",
    },
    {
      icon: CheckCircle,
      title: "High Efficiency",
      desc: "Optimized encryption algorithms and intelligent caching deliver lightning-fast file operations.",
      features: ["Instant Encryption", "Smart Caching", "Minimal Overhead"],
      colorClass: "from-primary/10 to-secondary/10",
      borderColor: "hover:border-primary/50",
      hoverShadow: "hover:shadow-primary/10",
    },
  ]

  return (
    <section id="features" className="px-4 sm:px-6 lg:px-8 py-20 max-w-7xl mx-auto">
      <ScrollReveal>
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Choose SafeRaho?</h2>
          <p className="text-foreground/70 text-lg max-w-2xl mx-auto">
            Enterprise-grade security with zero-knowledge architecture ensures your files remain encrypted and private.
          </p>
        </div>
      </ScrollReveal>

      <div className="grid md:grid-cols-3 gap-8">
        {features.map((feature, idx) => {
          const Icon = feature.icon
          return (
            <ScrollReveal key={idx}>
              <InteractiveCard>
                <div className="group relative">
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${feature.colorClass} rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                  ></div>
                  <div
                    className={`relative border border-border/40 rounded-xl p-8 bg-card ${feature.borderColor} transition-colors duration-300`}
                  >
                    <Icon
                      className={`w-12 h-12 text-primary mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}
                    />
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-foreground/70 mb-6">{feature.desc}</p>

                    <div
                      className={`h-48 rounded-lg bg-gradient-to-br ${feature.colorClass} border border-border/30 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300`}
                    >
                      <div className="text-center">
                        <Icon className={`w-12 h-12 mx-auto text-primary/50 mb-2`} />
                        <p className="text-sm text-foreground/50">Advanced Security</p>
                      </div>
                    </div>

                    <ul className="space-y-2 text-sm">
                      {feature.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle className={`w-4 h-4 text-primary`} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </InteractiveCard>
            </ScrollReveal>
          )
        })}
      </div>
    </section>
  )
}
