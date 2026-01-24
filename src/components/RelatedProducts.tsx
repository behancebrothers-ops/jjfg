import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DbProductCard } from "./DbProductCard";
import { Skeleton } from "./ui/skeleton";

interface RelatedProductsProps {
  currentProductId: string;
  category: string;
  price: number;
}

export const RelatedProducts = ({ currentProductId, category, price }: RelatedProductsProps) => {
  const { data: relatedProducts = [], isLoading } = useQuery({
    queryKey: ["related-products", currentProductId, category],
    queryFn: async () => {
      // Fetch products from the same category, excluding current product
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("category", category)
        .neq("id", currentProductId)
        .gt("stock", 0) // Only show in-stock products
        .limit(4);

      if (error) throw error;

      // Sort by price similarity
      return (data || []).sort((a, b) => {
        const aPriceDiff = Math.abs(a.price - price);
        const bPriceDiff = Math.abs(b.price - price);
        return aPriceDiff - bPriceDiff;
      });
    },
  });

  if (isLoading) {
    return (
      <section className="py-16 border-t">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">You May Also Like</h2>
            <p className="text-muted-foreground">
              Similar items based on style and price
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-80 w-full" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (relatedProducts.length === 0) return null;

  return (
    <section className="py-16 border-t">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">You May Also Like</h2>
          <p className="text-muted-foreground">
            Similar items based on style and price
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {relatedProducts.map((product) => (
            <DbProductCard 
              key={product.id} 
              id={product.id}
              name={product.name}
              price={product.price}
              imageUrl={product.image_url}
              category={product.category}
              stock={product.stock}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
