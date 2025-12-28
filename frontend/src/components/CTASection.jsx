"use client"

import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { ScrollReveal } from "./ScrollReveal"

export function CTASection() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-20 max-w-7xl mx-auto">
      <ScrollReveal>
        <div className="relative rounded-2xl border border-border/40 
                        bg-linear-to-r from-primary/10 via-transparent to-secondary/10 
                        p-12 text-center group 
                        hover:border-primary/50 transition-all duration-300 
                        hover:shadow-lg hover:shadow-primary/20">

          {/* Glow Layer */}
          <div className="absolute inset-0 bg-gradient-to-r 
                          from-primary/5 to-secondary/5 rounded-2xl blur-xl 
                          group-hover:from-primary/10 group-hover:to-secondary/10 
                          transition-all duration-300"></div>

          {/* Content */}
          <div className="relative space-y-6">
            <h2 className="text-4xl font-bold group-hover:scale-105 transition-transform duration-300">
              Ready to Secure Your Files?
            </h2>

            <p className="text-foreground/70 text-lg max-w-2xl mx-auto">
              Join thousands of users who trust SafeRaho with their most sensitive files.
            </p>

            {/* CTA Button */}
            <Link to="/register" className="block w-max">
              <button
                type="button"
                className="w-64 bg-primary hover:bg-primary/90 text-primary-foreground 
                           px-8 py-3 rounded-md flex items-center gap-2 
                           transition-all duration-300 hover:scale-105 cursor-pointer">
                           Start Encrypting <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>
      </ScrollReveal>
    </section>
  )
}
