import { useEffect, useState } from "react";
import { ProductCard } from "./ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "./ui/skeleton";
import { sessionStorage, STORAGE_KEYS } from "@/lib/storage";
import { logger } from "@/lib/logger";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category: string;
  stock: number;
}

interface ProductRecommendationsProps {
  currentProductId?: string;
  title?: string;
  limit?: number;
}

export const ProductRecommendations = ({
  currentProductId,
  title = "Recommended for You",
  limit = 6,
}: ProductRecommendationsProps) => {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [strategy, setStrategy] = useState("");

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        const sessionId = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);

        const { data, error } = await supabase.functions.invoke("get-recommendations", {
          body: {
            user_id: user?.id,
            session_id: sessionId,
            product_id: currentProductId,
            limit,
          },
        });

        if (error) {
          logger.error("Error fetching recommendations", error);
          return;
        }

        if (data?.recommendations) {
          setRecommendations(data.recommendations);
          setStrategy(data.strategy);
        }
      } catch (error) {
        logger.error("Error in fetchRecommendations", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [currentProductId, limit]);

  if (loading) {
    return (
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">{title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">{title}</h2>
          {strategy && (
            <span className="text-sm text-muted-foreground">
              {strategy === "similar_products" && "Similar Items"}
              {strategy === "personalized" && "Based on Your Activity"}
              {strategy === "session_based" && "Based on Your Browsing"}
              {strategy.includes("popular") && "Popular Items"}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {recommendations.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              image={product.image_url || "/placeholder.svg"}
              category={product.category}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
