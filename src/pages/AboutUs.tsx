import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Heart, Award, Users, Globe } from "lucide-react";
import { SEOHead, generateWebPageSchema } from "@/components/SEOHead";

const AboutUs = () => {
  const values = [
    {
      icon: Heart,
      title: "Passion for Quality",
      description: "Every piece is carefully selected and crafted with attention to detail and superior materials."
    },
    {
      icon: Award,
      title: "Timeless Design",
      description: "We believe in creating pieces that transcend trends and remain elegant season after season."
    },
    {
      icon: Users,
      title: "Community First",
      description: "Our customers are at the heart of everything we do, building lasting relationships beyond transactions."
    },
    {
      icon: Globe,
      title: "Sustainable Future",
      description: "Committed to ethical practices and environmental responsibility in every step of our process."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="About Us | LUXE Premium Fashion"
        description="Learn about LUXE's story, our passion for quality fashion, and commitment to timeless design. Redefining modern fashion with elegance since 2020."
        keywords="about luxe, fashion brand story, luxury fashion company, sustainable fashion"
        canonicalUrl="/about"
        structuredData={generateWebPageSchema({
          name: "About LUXE Premium Fashion",
          description: "Redefining modern fashion with timeless elegance and uncompromising quality since 2020.",
          url: "https://luxurious-store.vercel.app/about",
        })}
      />
      <Navigation />
      
      {/* Hero Section */}
      <section className="hero-gradient py-20 border-b">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl mb-6">About LUXE</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Redefining modern fashion with timeless elegance and uncompromising quality since 2020.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-8 text-center">Our Story</h2>
          <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
            <p>
              Founded in 2020, LUXE emerged from a simple vision: to create a fashion destination where 
              quality meets accessibility, and style transcends fleeting trends.
            </p>
            <p>
              What began as a small boutique has grown into a beloved brand trusted by thousands 
              worldwide. Our journey has been guided by an unwavering commitment to craftsmanship, 
              sustainability, and the belief that everyone deserves to feel confident in what they wear.
            </p>
            <p>
              Today, we partner with artisans and manufacturers who share our values, ensuring every 
              piece in our collection meets the highest standards of quality and ethical production.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-12 text-center">Our Values</h2>
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
          <h2 className="text-4xl font-bold mb-6">Meet Our Team</h2>
          <p className="text-lg text-muted-foreground mb-12">
            Behind LUXE is a passionate team of designers, stylists, and fashion enthusiasts 
            dedicated to bringing you the best in contemporary fashion.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-square bg-muted rounded-lg"></div>
                <h4 className="font-semibold text-lg">Team Member {i}</h4>
                <p className="text-sm text-muted-foreground">Position Title</p>
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
