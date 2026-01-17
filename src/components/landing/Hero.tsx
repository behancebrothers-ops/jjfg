import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Terminal, Sparkles } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] animate-pulse" />

      <div className="container relative z-10 px-4 py-20">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Crafting Digital Excellence Since 2024
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            We Build{" "}
            <span className="text-gradient">Websites</span>
            <br />
            That Drive{" "}
            <span className="relative inline-block">
              <span className="text-foreground">Results</span>
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 300 12"
                fill="none"
              >
                <path
                  d="M2 10C50 4 100 2 150 6C200 10 250 8 298 4"
                  stroke="url(#gradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="50%" stopColor="hsl(var(--secondary))" />
                    <stop offset="100%" stopColor="hsl(var(--accent))" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            From stunning websites to powerful e-commerce platforms, we transform 
            your vision into digital reality. Premium development, transparent pricing.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button size="lg" className="glow-primary text-lg px-8 h-14" asChild>
              <NavLink to="/order">
                Start Your Project
                <ArrowRight className="ml-2 w-5 h-5" />
              </NavLink>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 h-14 glass" asChild>
              <NavLink to="/portfolio">
                <Play className="mr-2 w-5 h-5" />
                View Our Work
              </NavLink>
            </Button>
          </div>

          {/* Code Preview Block */}
          <div className="max-w-2xl mx-auto glass rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/70" />
                <div className="w-3 h-3 rounded-full bg-chart-5" />
                <div className="w-3 h-3 rounded-full bg-accent" />
              </div>
              <div className="flex items-center gap-2 ml-4 text-sm text-muted-foreground">
                <Terminal className="w-4 h-4" />
                <span className="font-mono">your-project.tsx</span>
              </div>
            </div>
            <div className="p-6 text-left font-mono text-sm">
              <div className="text-muted-foreground">
                <span className="text-secondary">const</span>{" "}
                <span className="text-foreground">yourDream</span>{" "}
                <span className="text-muted-foreground">=</span>{" "}
                <span className="text-accent">await</span>{" "}
                <span className="text-primary">DevForge</span>
                <span className="text-foreground">.build(</span>
                <span className="text-chart-5">"amazing-website"</span>
                <span className="text-foreground">);</span>
              </div>
              <div className="mt-2 text-muted-foreground">
                <span className="text-secondary">console</span>
                <span className="text-foreground">.log(</span>
                <span className="text-accent">yourDream</span>
                <span className="text-foreground">);</span>{" "}
                <span className="text-muted-foreground">// 🚀 Success!</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-16 border-t border-border">
            {[
              { value: "150+", label: "Projects Delivered" },
              { value: "98%", label: "Client Satisfaction" },
              { value: "24/7", label: "Support Available" },
              { value: "50+", label: "Happy Clients" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-gradient mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
