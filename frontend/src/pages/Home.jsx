import React from "react";
import { Link } from "react-router-dom"; 
import { Lock, Shield, Zap, ArrowRight, CheckCircle } from "lucide-react";
import "../global.css"; // keep your Tailwind globals
import HeroVideo from "./HeroVideo.jsx";
import { AnimatedText } from "../components/AnimatedText.jsx";
import { StatsSection } from "../components/StatsSection.jsx";
import { FeaturesSection } from "../components/FeatureSection.jsx";
import { Security } from "../components/Security.jsx";
import { Benifits } from "../components/Benifits.jsx";
import { CTASection } from "../components/CTASection.jsx";
import { Avatar } from "../components/Avatar.jsx";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
        
          <a href="#home" className="flex items-center">
            <img src="/logo.png" alt="logo" className="h-20 w-20" />
            <div className="text-3xl font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              SafeRaho
            </div>
          </a>


            <div className="hidden md:flex items-center gap-8">
              <a href="#home" className="text-lg text-foreground/70 hover:text-foreground transition-colors">
                Home
              </a>
              <a href="#features" className="text-lg text-foreground/70 hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#security" className="text-lg text-foreground/70 hover:text-foreground transition-colors">
                Security
              </a>
              <a href="#benefits" className="text-lg text-foreground/70 hover:text-foreground transition-colors">
                Benefits
              </a>
            </div>

           {/* <div className="flex items-center gap-2">
              <Link to="/register">
                <button className="text-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md cursor-pointer">
                  Register
                </button>
              </Link>

              <Link to="/login">
                <button className="text-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md cursor-pointer">
                  Login
                </button>
              </Link>
            </div> */}

            <div className="relative">
              <Avatar />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative w-full h-screen flex items-end pb-24">

        {/* Background Video */}
        <div className="absolute inset-0">
          <HeroVideo />
        </div>

        {/* TOP → BOTTOM Fade (clear → black) */}
        <div className="absolute inset-0 -z-10 bg-linear-to-b from-black/0 via-black/20 to-black/80"></div>


        {/* HERO CONTENT (moved down with padding) */}
        <div className="relative z-10 w-full text-center px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="space-y-4">
           <h1 className="text-5xl md:text-7xl font-bold text-center tracking-tight">
           <span className="bg-linear-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
          <AnimatedText
            words={["SafeRaho","Simple", "Encrypted", "Fast", "Trusted"]}
            typingSpeed={100}
            pause={1000}
          />
        </span>
      </h1>

            <p className="text-xl md:text-2xl text-foreground/80 max-w-2xl mx-auto">
              Zero-Knowledge File Encryption. Your Files. Your Keys. Complete Privacy.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/login">
              <button className="bg-primary hover:bg-primary/90 text-primary-foreground 
                           px-8 py-3 rounded-md flex items-center gap-2 
                           transition-all duration-300 hover:scale-105 cursor-pointer">
                Get Started <ArrowRight className="w-5 h-5" />
              </button>
            </Link>

            <button className="glass-btn border hover:bg-card bg-transparent px-8 py-3 rounded-md flex items-center transition-all duration-300 hover:scale-105 cursor-pointer">
              Learn More
            </button>
          </div>
        </div>

      </section>
 <div>

      {/* Stats Section */}
      <StatsSection />
      
      {/* Features Section */}
      <FeaturesSection />

      {/* Security Section*/}
      <Security />

      {/* Benefits Section */}
      <Benifits />

      {/* CTA Section */}
      <CTASection />
    </div>

      {/* Footer */}
      <footer className="border-t border-border/40 px-4 sm:px-6 lg:px-8 py-12 mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <p className="font-bold text-lg bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                SafeRaho
              </p>
              <p className="text-foreground/60 text-sm mt-2">Zero-knowledge file encryption</p>
            </div>

            <div>
              <p className="font-semibold mb-3">Product</p>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li><a href="#home" className="hover:text-foreground">Home</a></li>
                <li><a href="#features" className="hover:text-foreground">Features</a></li>
                <li><a href="#security" className="hover:text-foreground">Security</a></li>
                <li><a href="#benefits" className="hover:text-foreground">Pricing</a></li>
              </ul>
            </div>

            <div>
              <p className="font-semibold mb-3">Company</p>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Blog</a></li>
                <li><a href="#" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>

            <div>
              <p className="font-semibold mb-3">Legal</p>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li><a href="#" className="hover:text-foreground">Privacy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms</a></li>
                <li><a href="#" className="hover:text-foreground">Security</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border/40 pt-8 text-center text-foreground/60 text-sm">
              © {new Date().getFullYear()} SafeRaho. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
