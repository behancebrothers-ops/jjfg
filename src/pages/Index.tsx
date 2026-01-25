import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Heart, Star } from "lucide-react";
import { toast } from "sonner";
import heroBanner from "@/assets/hero-banner.jpg";
import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { TrustBadges } from "@/components/TrustBadges";
import { NewsletterPopup } from "@/components/NewsletterPopup";
import { AdvertisementPopup } from "@/components/AdvertisementPopup";
import { MemoizedProductCard } from "@/components/MemoizedProductCard";
import { OrganizationSchema } from "@/components/OrganizationSchema";
import { AccessibilityNav } from "@/components/AccessibilityNav";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ProductRecommendations } from "@/components/ProductRecommendations";
import { ProductGridSkeleton } from "@/components/ProductSkeleton";
import { useQuery } from "@tanstack/react-query";
import { PromoBannerSlider } from "@/components/PromoBannerSlider";
import { useImagePreload } from "@/hooks/useImagePreload";
import { SEOHead, generateLocalBusinessSchema } from "@/components/SEOHead";

// Define types outside component
type DBProduct = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string;
  stock: number;
};

const Index = () => {
  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = (e.target as HTMLFormElement).email.value;
    toast.success("Welcome to the cozy club! ✨");
  };

  // Use React Query for featured products with extended cache
  const { data: featuredProducts = [], isLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;

      return (data || []).map((p: any) => ({
        ...p,
        price: Number(p.price),
      })) as DBProduct[];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - featured products change rarely
    gcTime: 60 * 60 * 1000, // 60 minutes
  });

  // Preload featured product images for faster rendering
  const featuredImages = useMemo(() => {
    return featuredProducts
      .map(p => p.image_url)
      .filter((url): url is string => !!url);
  }, [featuredProducts]);

  useImagePreload(featuredImages, { priority: "high" });

  // Animation variants
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
  };

  const float = {
    y: [0, -8, 0],
    transition: { duration: 4, repeat: Infinity as number },
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="SCENT LUXE - Premium Fragrance Boutique | Luxury Perfumes & Home Scents"
        description="Discover exquisite fragrances that captivate the senses. Shop luxury perfumes, home scents, and exclusive collections at SCENT LUXE. Free shipping on orders over $100."
        keywords="luxury perfumes, premium fragrances, designer scents, home fragrances, essential oils, niche perfumery, scent boutique"
        canonicalUrl="/"
        structuredData={generateLocalBusinessSchema()}
      />
      <OrganizationSchema />
      <AccessibilityNav />
      <Navigation />
      <PromoBannerSlider />
      <NewsletterPopup />
      <AdvertisementPopup />
      <main id="main-content" className="flex-grow" role="main">
        {/* HERO SECTION – Full screen with elegant design */}
        <section className="relative min-h-[90vh] overflow-hidden bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5">
          {/* Background Image with Overlay */}
          <div className="absolute inset-0">
            <img
              src={heroBanner}
              alt="Luxury fragrance collection"
              className="w-full h-full object-cover"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
          </div>

          {/* Floating Decorative Orbs */}
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl pointer-events-none"
            animate={float}
          />
          <motion.div
            className="absolute bottom-32 right-16 w-96 h-96 bg-accent/20 rounded-full blur-3xl pointer-events-none"
            animate={{ ...float, transition: { ...float.transition, delay: 1 } }}
          />

          {/* Hero Content */}
          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 min-h-[90vh] flex items-center">
            <motion.div
              className="max-w-3xl py-20"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
            >
              {/* Badge */}
              <motion.div
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 shadow-xl mb-8"
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.3 }}
                whileHover={{ scale: 1.05, boxShadow: "0 0 30px hsl(var(--accent) / 0.4)" }}
              >
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-white/95">New Collection • 2025</span>
              </motion.div>

              {/* Heading */}
              <h1 className="mb-6 text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-serif font-bold leading-[1.1] tracking-tight">
                <motion.span
                  className="block bg-gradient-to-r from-accent via-primary-foreground to-accent bg-clip-text text-transparent drop-shadow-lg"
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                >
                  Discover
                </motion.span>
                <motion.span
                  className="block text-white drop-shadow-xl"
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                >
                  Your Signature
                </motion.span>
              </h1>

              {/* Subtitle */}
              <motion.p
                className="text-lg sm:text-xl md:text-2xl text-white/90 mb-10 max-w-xl font-light leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
              >
                Immerse yourself in exquisite fragrances. Where artistry meets olfactory elegance.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.6 }}
              >
                <Link to="/products" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground border-0 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-base sm:text-lg px-8 py-6 rounded-xl font-bold group"
                  >
                    Explore Fragrances
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/new-arrivals" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto bg-white/10 backdrop-blur-md border-2 border-white/40 text-white hover:bg-white/20 hover:border-white/60 transition-all duration-300 text-base sm:text-lg px-8 py-6 rounded-xl font-semibold"
                  >
                    New Scents
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>

          {/* Scroll Indicator */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
          >
            <motion.div
              className="w-6 h-10 border-2 border-white/40 rounded-full flex justify-center p-2"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className="w-1.5 h-3 bg-white/60 rounded-full" />
            </motion.div>
          </motion.div>
        </section>

        <TrustBadges />

        {/* Personalized Recommendations */}
        <ProductRecommendations
          title="Curated For You"
          limit={6}
        />

        {/* CATEGORIES – Scent Families */}
        <section className="bg-background py-20 sm:py-28">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <motion.div
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 text-primary font-semibold shadow-md border border-primary/20"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                viewport={{ once: true }}
              >
                <Heart className="w-4 h-4 text-accent" />
                Find Your Essence
              </motion.div>

              <motion.h2
                className="mt-6 text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-foreground"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                Shop by{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Scent Family
                </span>
              </motion.h2>

              <motion.p
                className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                Crafted with passion — because every fragrance tells a story.
              </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { img: product3, title: "Woody & Oud", desc: "Deep & Mysterious", link: "/products?category=woody" },
                { img: product1, title: "Floral & Rose", desc: "Elegant & Romantic", link: "/products?category=floral" },
                { img: product2, title: "Fresh & Citrus", desc: "Light & Invigorating", link: "/products?category=fresh" },
              ].map((cat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -8 }}
                  className="group"
                >
                  <Link to={cat.link} className="block relative h-80 sm:h-96 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                    <img
                      src={cat.img}
                      alt={`${cat.title} Collection`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <h3 className="text-2xl sm:text-3xl font-bold mb-1 drop-shadow-md">
                        {cat.title}
                      </h3>
                      <p className="text-sm font-medium text-white/80 mb-3">{cat.desc}</p>
                      <div className="flex items-center gap-2 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Explore <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURED PRODUCTS */}
        <section className="bg-gradient-to-b from-background to-primary/5 py-20 sm:py-28">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <motion.div
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 text-primary font-semibold shadow-md"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{ type: "spring" }}
                viewport={{ once: true }}
              >
                <Star className="w-4 h-4 text-accent" fill="currentColor" />
                Bestsellers
              </motion.div>

              <motion.h2
                className="mt-6 text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-foreground"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                Signature{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Fragrances
                </span>
              </motion.h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {isLoading ? (
                <ProductGridSkeleton count={3} />
              ) : featuredProducts.length > 0 ? (
                featuredProducts.map((product, i) => (
                  <div
                    key={product.id}
                    className="transform transition-all duration-300 hover:-translate-y-2"
                  >
                    <MemoizedProductCard
                      id={product.id}
                      name={product.name}
                      price={product.price}
                      imageUrl={product.image_url}
                      category={product.category}
                      stock={product.stock}
                      priority={i < 3}
                    />
                  </div>
                ))
              ) : (
                <p className="col-span-3 text-center text-muted-foreground py-12">
                  No featured items yet. Check back soon!
                </p>
              )}
            </div>

            <motion.div
              className="text-center mt-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <Link to="/products">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 px-8 py-6 rounded-xl font-bold group"
                >
                  View All Fragrances
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* NEWSLETTER */}
        <section className="py-20 sm:py-28 bg-gradient-to-b from-primary/5 to-accent/5">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="max-w-3xl mx-auto bg-white/80 backdrop-blur-lg p-8 sm:p-12 rounded-2xl shadow-xl border border-border/50 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <motion.div
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 text-primary font-semibold shadow-sm mb-6"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                viewport={{ once: true }}
              >
                <Sparkles className="w-4 h-4 text-accent" />
                Newsletter
              </motion.div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
                Join the{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Scent Circle
                </span>
              </h2>

              <p className="text-muted-foreground mb-8 text-base sm:text-lg max-w-lg mx-auto">
                Exclusive launches, fragrance tips, and special offers — delivered straight to your inbox.
              </p>

              <form
                onSubmit={handleNewsletterSubmit}
                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
              >
                <input
                  type="email"
                  name="email"
                  placeholder="you@email.com"
                  className="flex-1 px-5 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
                  required
                />
                <Button
                  type="submit"
                  size="lg"
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-md hover:shadow-lg transition-all px-6 rounded-xl font-semibold"
                >
                  Subscribe
                </Button>
              </form>

              <p className="text-xs text-muted-foreground mt-4">
                No spam. Pure elegance. Unsubscribe anytime.
              </p>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
