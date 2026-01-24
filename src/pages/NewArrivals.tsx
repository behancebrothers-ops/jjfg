import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DbProductCard } from "@/components/DbProductCard";
import { ProductGridSkeleton } from "@/components/ProductSkeleton";
import { toast } from "sonner";
import { SEOHead, generateWebPageSchema } from "@/components/SEOHead";

type DBProduct = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string;
  stock: number;
};

const NewArrivals = () => {
  const [newProducts, setNewProducts] = useState<DBProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadNewArrivals = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("is_new_arrival", true)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setNewProducts(
          (data || []).map((p: any) => ({
            ...p,
            price: Number(p.price),
          }))
        );
      } catch (err) {
        console.error("Failed to load new arrivals:", err);
        toast.error("Failed to load new arrivals.");
      } finally {
        setIsLoading(false);
      }
    };
    loadNewArrivals();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="New Arrivals | LUXE Premium Fashion"
        description="Discover the latest additions to our collection. Fresh styles, timeless elegance. Shop new arrivals in men's, women's, and accessories fashion."
        keywords="new arrivals, new fashion, latest clothing, new collection, fresh styles"
        canonicalUrl="/new-arrivals"
        structuredData={generateWebPageSchema({
          name: "New Arrivals | LUXE Premium Fashion",
          description: "Discover the latest additions to our collection. Fresh styles, timeless elegance.",
          url: "https://luxurious-store.vercel.app/new-arrivals",
        })}
      />
      <Navigation />
      
      {/* Hero Section */}
      <section className="hero-gradient py-20 border-b">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full mb-6">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-accent">Just Landed</span>
          </div>
          <h1 className="text-5xl md:text-6xl mb-6">New Arrivals</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover the latest additions to our collection. Fresh styles, timeless elegance.
          </p>
        </div>
      </section>

      {/* Products Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <p className="text-muted-foreground">{newProducts.length} new items</p>
          <select className="px-4 py-2 rounded-md border bg-background text-sm">
            <option>Sort by: Newest First</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            <ProductGridSkeleton count={6} />
          ) : newProducts.length > 0 ? (
            newProducts.map((product) => (
              <DbProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                imageUrl={product.image_url}
                category={product.category}
                stock={product.stock}
              />
            ))
          ) : (
            <p className="col-span-3 text-center text-gray-500 py-12">No new arrivals yet. Check back soon!</p>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default NewArrivals;
