import { InteractiveCard } from "./InteractiveCard"
import { ScrollReveal } from "./ScrollReveal"

export function Benifits() {
    return (
        <section id="benefits" className="px-4 sm:px-6 lg:px-8 py-20 max-w-7xl mx-auto">
        {/* Heading */}
        <ScrollReveal>
            <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">What You Get</h2>
            <p className="text-foreground/70 text-lg">
                Everything you need for secure file storage and management
            </p>
            </div>
        </ScrollReveal>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 gap-8">
            {[
            { title: "Instant Upload", desc: "Upload files instantly with progress tracking" },
            { title: "Secure Sharing", desc: "Share encrypted files with password protection" },
            { title: "Key Management", desc: "Automatic key generation and safe storage" },
            { title: "24/7 Access", desc: "Access your vault anytime, anywhere" },
            { title: "Bulk Operations", desc: "Encrypt or decrypt multiple files at once" },
            { title: "Version History", desc: "Keep track of file modifications over time" },
            ].map((benefit) => (
            <ScrollReveal key={benefit.title}>
                <InteractiveCard>
                <div className="border border-border/40 rounded-lg p-6 bg-card 
                                hover:border-primary/50 transition-all duration-300 
                                group hover:shadow-lg hover:shadow-primary/10">
                    <h3 className="font-semibold text-lg mb-2 
                                group-hover:text-primary transition-colors">
                    {benefit.title}
                    </h3>
                    <p className="text-foreground/70 
                                group-hover:text-foreground/80 transition-colors">
                    {benefit.desc}
                    </p>
                </div>
                </InteractiveCard>
            </ScrollReveal>
            ))}
        </div>

        </section>

);
}