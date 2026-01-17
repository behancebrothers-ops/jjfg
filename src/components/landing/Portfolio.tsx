import { ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NavLink } from "@/components/NavLink";

const projects = [
  {
    id: 1,
    title: "TechFlow SaaS",
    category: "Web Application",
    description: "A comprehensive project management platform for tech teams.",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
    tags: ["React", "Node.js", "PostgreSQL"],
    link: "#",
  },
  {
    id: 2,
    title: "Luxe Boutique",
    category: "E-Commerce",
    description: "Premium fashion e-commerce with personalized shopping experience.",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop",
    tags: ["Shopify", "Custom Theme", "Analytics"],
    link: "#",
  },
  {
    id: 3,
    title: "HealthSync App",
    category: "Web Development",
    description: "Healthcare platform connecting patients with specialists.",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop",
    tags: ["Next.js", "Supabase", "Stripe"],
    link: "#",
  },
  {
    id: 4,
    title: "Creative Studio",
    category: "Branding",
    description: "Complete brand identity for a creative agency.",
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=600&fit=crop",
    tags: ["Logo Design", "Brand Guide", "Web Design"],
    link: "#",
  },
];

const Portfolio = () => {
  return (
    <section id="portfolio" className="py-24 relative">
      <div className="container px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-primary font-semibold mb-4 uppercase tracking-wider text-sm">
            Our Work
          </p>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Projects That{" "}
            <span className="text-gradient">Speak for Themselves</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Browse through our latest projects and see how we've helped 
            businesses achieve their digital goals.
          </p>
        </div>

        {/* Projects Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group relative glass rounded-xl overflow-hidden"
            >
              {/* Image */}
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={project.image}
                  alt={project.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent opacity-60" />
              </div>

              {/* Content Overlay */}
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <Badge variant="secondary" className="w-fit mb-3">
                  {project.category}
                </Badge>
                <h3 className="text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {project.title}
                </h3>
                <p className="text-muted-foreground mb-4 line-clamp-2">
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-primary/10 text-primary rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-fit opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  View Project
                  <ExternalLink className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* View All CTA */}
        <div className="text-center mt-12">
          <Button size="lg" asChild>
            <NavLink to="/portfolio">
              View All Projects
              <ArrowRight className="ml-2 w-5 h-5" />
            </NavLink>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Portfolio;
