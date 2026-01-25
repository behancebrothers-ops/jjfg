import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Heart, Award, Users, Globe } from "lucide-react";
import { SEOHead, generateWebPageSchema } from "@/components/SEOHead";

const AboutUs = () => {
  const values = [
    {
      icon: Heart,
      title: "Passion for Perfumery",
      description: "Every fragrance is meticulously crafted with the finest ingredients sourced from around the world."
    },
    {
      icon: Award,
      title: "Timeless Elegance",
      description: "We create scents that transcend trends, becoming signature fragrances you'll cherish for years."
    },
    {
      icon: Users,
      title: "Scent Community",
      description: "Our customers are fragrance enthusiasts who share our passion for olfactory artistry."
    },
    {
      icon: Globe,
      title: "Sustainable Sourcing",
      description: "Committed to ethical ingredient sourcing and eco-conscious packaging in every bottle."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="About Us | SCENT LUXE Premium Fragrances"
        description="Discover the story behind SCENT LUXE, our passion for artisanal perfumery, and commitment to creating unforgettable fragrances since 2020."
        keywords="about scent luxe, fragrance brand story, luxury perfume company, artisanal perfumery"
        canonicalUrl="/about"
        structuredData={generateWebPageSchema({
          name: "About SCENT LUXE Premium Fragrances",
          description: "Crafting exquisite fragrances that captivate the senses and tell unique olfactory stories since 2020.",
          url: "https://scentluxe.com/about",
        })}
      />
      <Navigation />
      
      {/* Hero Section */}
      <section className="hero-gradient py-20 border-b">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-serif mb-6">About SCENT LUXE</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Crafting exquisite fragrances that captivate the senses and tell unique olfactory stories since 2020.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-serif font-bold mb-8 text-center">Our Story</h2>
          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
            <p>
              Founded in 2020, SCENT LUXE emerged from a profound passion for the art of perfumery — 
              a desire to create fragrances that evoke emotion, memory, and timeless elegance.
            </p>
            <p>
              What began as a small atelier has blossomed into a beloved fragrance house trusted by 
              discerning customers worldwide. Our journey is guided by an unwavering commitment to 
              artisanal craftsmanship, sustainable sourcing, and the belief that everyone deserves 
              to find their signature scent.
            </p>
            <p>
              Today, we collaborate with master perfumers and source the finest ingredients from 
              around the globe, ensuring every bottle captures the essence of luxury and sophistication.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-serif font-bold mb-12 text-center">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="p-6 text-center">
                <div className="inline-flex p-4 bg-accent/10 rounded-full mb-4">
                  <value.icon className="h-8 w-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-serif font-bold mb-6">Meet Our Artisans</h2>
          <p className="text-lg text-muted-foreground mb-12">
            Behind SCENT LUXE is a passionate team of perfumers, scent specialists, and fragrance 
            enthusiasts dedicated to crafting extraordinary olfactory experiences.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Master Perfumer", role: "Creative Director" },
              { name: "Scent Curator", role: "Product Development" },
              { name: "Fragrance Expert", role: "Customer Experience" },
            ].map((member, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-square bg-muted rounded-lg"></div>
                <h4 className="font-semibold text-lg">{member.name}</h4>
                <p className="text-sm text-muted-foreground">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutUs;
