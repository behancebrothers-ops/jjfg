import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Services from "@/components/landing/Services";
import Portfolio from "@/components/landing/Portfolio";
import Testimonials from "@/components/landing/Testimonials";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background dark">
      <Navbar />
      <Hero />
      <Services />
      <Portfolio />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
