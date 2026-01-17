import { Code, ShoppingCart, Palette, Settings, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NavLink } from "@/components/NavLink";

const services = [
  {
    icon: Code,
    title: "Website Development",
    description: "Custom websites built with modern technologies. Fast, responsive, and optimized for conversions.",
    features: ["React & Next.js", "Custom CMS", "SEO Optimized", "Mobile-First"],
    href: "/services/web-development",
    gradient: "from-primary to-primary/50",
  },
  {
    icon: ShoppingCart,
    title: "E-Commerce Solutions",
    description: "Powerful online stores that drive sales. From Shopify to custom solutions.",
    features: ["Payment Integration", "Inventory Management", "Analytics Dashboard", "Multi-currency"],
    href: "/services/ecommerce",
    gradient: "from-secondary to-secondary/50",
  },
  {
    icon: Palette,
    title: "Branding & Design",
    description: "Create a memorable brand identity that stands out from the competition.",
    features: ["Logo Design", "Brand Guidelines", "UI/UX Design", "Marketing Assets"],
    href: "/services/branding",
    gradient: "from-accent to-accent/50",
  },
  {
    icon: Settings,
    title: "Custom Development",
    description: "Tailored solutions for unique business needs. APIs, dashboards, and more.",
    features: ["API Development", "Admin Dashboards", "Integrations", "Automation"],
    href: "/services/custom",
    gradient: "from-chart-4 to-chart-4/50",
  },
];

const Services = () => {
  return (
    <section id="services" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/30 to-transparent" />
      
      <div className="container relative z-10 px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-primary font-semibold mb-4 uppercase tracking-wider text-sm">
            Our Services
          </p>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Everything You Need to{" "}
            <span className="text-gradient">Succeed Online</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            From concept to launch, we provide comprehensive digital solutions 
            that help your business thrive in the digital age.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {services.map((service) => (
            <Card 
              key={service.title} 
              className="glass group hover:border-primary/50 transition-all duration-300"
            >
              <CardHeader>
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${service.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <service.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors">
                  {service.title}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {service.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-6">
                  {service.features.map((feature) => (
                    <span 
                      key={feature}
                      className="px-3 py-1 text-xs font-medium bg-muted rounded-full text-muted-foreground"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
                <Button variant="ghost" className="group/btn p-0 h-auto" asChild>
                  <NavLink to={service.href}>
                    Learn More
                    <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </NavLink>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-4">
            Not sure which service fits your needs?
          </p>
          <Button size="lg" variant="outline" className="glass" asChild>
            <NavLink to="/contact">
              Let's Discuss Your Project
              <ArrowRight className="ml-2 w-5 h-5" />
            </NavLink>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Services;
