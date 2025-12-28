"use client"

import { Shield, CheckCircle } from "lucide-react"
import { ScrollReveal } from "./ScrollReveal"

export function Security() {
  return (
    <section id="security" className="relative px-4 sm:px-6 lg:px-8 py-20 max-w-7xl mx-auto">
      <ScrollReveal>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          
          {/* LEFT — Enterprise Security */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Enterprise Security
              </h2>
              <p className="text-foreground/70 text-lg">
                Built with cryptographic principles that protect your data at every layer.
              </p>
            </div>

            <div className="space-y-4">
              {[
                "End-to-End Encryption",
                "Zero-Knowledge Architecture",
                "Military-Grade Cryptography",
                "Audit-Ready Compliance",
              ].map((item) => (
                <ScrollReveal key={item}>
                  <div className="flex items-start gap-3 group">
                    <CheckCircle className="w-6 h-6 text-primary shrink-0 mt-0.5
                        group-hover:scale-125 transition-transform duration-300" />
                    <div>
                      <p className="font-semibold group-hover:text-primary transition-colors">
                        {item}
                      </p>
                      <p className="text-foreground/60 text-sm mt-1">
                        Industry-leading security standards applied
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>

          {/* RIGHT — Military Grade Card */}
          <ScrollReveal>
            <div className="relative h-96 rounded-2xl border border-border/20 
              bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center 
              justify-center overflow-hidden group hover:border-primary/50 
              transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
              
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 
                to-transparent group-hover:from-primary/30 transition-all duration-300">
              </div>

              <div className="relative text-center space-y-4">
                <Shield className="w-24 h-24 mx-auto text-primary opacity-40 
                  group-hover:opacity-100 group-hover:scale-110 
                  transition-all duration-300" />
                <p className="text-foreground/60 group-hover:text-foreground transition-colors">
                  Military-Grade Security
                </p>
              </div>
            </div>
          </ScrollReveal>

        </div>
      </ScrollReveal>
    </section>
  )
}
