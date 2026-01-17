import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const CTA = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px]" />
      
      <div className="container relative z-10 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Limited Time: 20% Off First Project</span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6">
            Ready to Transform Your{" "}
            <span className="text-gradient">Digital Presence?</span>
          </h2>

          {/* Description */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Let's discuss your project and create something extraordinary together. 
            Start with a free consultation – no commitment required.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="glow-primary text-lg px-8 h-14" asChild>
              <NavLink to="/order">
                Start Your Project
                <ArrowRight className="ml-2 w-5 h-5" />
              </NavLink>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 h-14 glass" asChild>
              <NavLink to="/contact">Schedule Free Call</NavLink>
            </Button>
          </div>

          {/* Trust Elements */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              No upfront payment
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              Money-back guarantee
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              Free revisions included
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
