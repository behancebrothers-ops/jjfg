import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { Loader2, Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category: string;
  stock: number;
}

interface FavoriteWithProduct {
  id: string;
  product_id: string;
  products: Product;
}

export default function Wishlist() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { favorites, loading, removeFavorite } = useFavorites();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [productsLoading, setProductsLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    const fetchProducts = async () => {
      if (favorites.length === 0) {
        setProducts({});
        setProductsLoading(false);
        return;
      }

      try {
        setProductsLoading(true);
        const productIds = favorites.map(fav => fav.product_id);

        const { data, error } = await supabase
          .from("products")
          .select("id, name, price, image_url, category, stock")
          .in("id", productIds);

        if (error) throw error;

        const productsMap = (data || []).reduce((acc, product) => {
          acc[product.id] = product;
          return acc;
        }, {} as Record<string, Product>);

        setProducts(productsMap);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load product details",
          variant: "destructive",
        });
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, [favorites, toast]);

  const handleMoveToCart = async (productId: string, productName: string) => {
    setActionLoading(`cart-${productId}`);
    try {
      const success = await addToCart(productId, null, 1);
      if (success) {
        await removeFavorite(productId);
        toast({
          title: "Moved to cart",
          description: `${productName} has been added to your cart`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to move item to cart",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFromWishlist = async (productId: string) => {
    setActionLoading(`remove-${productId}`);
    try {
      await removeFavorite(productId);
      toast({
        title: "Removed",
        description: "Item removed from wishlist",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove item from wishlist",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearWishlist = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", session.user.id);

      if (error) throw error;

      toast({
        title: "Wishlist cleared",
        description: "All items removed from your wishlist",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear wishlist",
        variant: "destructive",
      });
    }
  };

  if (loading || productsLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  const favoritesWithProducts = favorites
    .map(fav => ({
      ...fav,
      product: products[fav.product_id]
    }))
    .filter(fav => fav.product);

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-3xl animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[30%] rounded-full bg-secondary/10 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] rounded-full bg-accent/5 blur-3xl animate-blob animation-delay-4000" />
      </div>

      <Navigation />

      <main className="flex-1 relative z-10 py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60 flex items-center gap-3">
                <Heart className="h-10 w-10 text-primary fill-primary animate-pulse" />
                My Wishlist
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                {favoritesWithProducts.length === 0
                  ? "Your collection of favorites is waiting to be started."
                  : `You have saved ${favoritesWithProducts.length} ${favoritesWithProducts.length === 1 ? 'item' : 'items'} for later.`}
              </p>
            </div>

            {favoritesWithProducts.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="glass-card hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all duration-300">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass-card border-white/20">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear wishlist?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all {favoritesWithProducts.length} items from your wishlist. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearWishlist} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Clear All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {favoritesWithProducts.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center max-w-2xl mx-auto border-dashed border-2 border-primary/10">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/5 flex items-center justify-center">
                <Heart className="h-12 w-12 text-primary/40" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Your wishlist is empty</h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Create your personal collection of exclusive items.
                <br />Browse our catalog and tap the heart icon to save what you love.
              </p>
              <Button onClick={() => navigate("/products")} size="lg" className="gradient-primary btn-glow px-8 rounded-full h-12 text-base">
                Explore Collection
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {favoritesWithProducts.map((fav, index) => (
                <div
                  key={fav.id}
                  className="group relative flex flex-col h-full animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex-1">
                    <ProductCard
                      id={fav.product.id}
                      name={fav.product.name}
                      price={fav.product.price}
                      image={fav.product.image_url || ""}
                      category={fav.product.category}
                      stock={fav.product.stock}
                    />
                  </div>

                  {/* Action Buttons Overlay - styled to look part of the card system */}
                  <div className="mt-4 grid grid-cols-[1fr,auto] gap-3">
                    <Button
                      onClick={() => handleMoveToCart(fav.product_id, fav.product.name)}
                      disabled={actionLoading !== null || fav.product.stock === 0}
                      className={`w-full glass-button hover:bg-primary hover:text-white transition-all duration-300 ${fav.product.stock === 0 ? 'opacity-50' : ''}`}
                    >
                      {actionLoading === `cart-${fav.product_id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          {fav.product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={() => handleRemoveFromWishlist(fav.product_id)}
                      disabled={actionLoading !== null}
                      variant="outline"
                      size="icon"
                      className="glass-card hover:bg-destructive hover:text-white hover:border-destructive transition-colors duration-300 aspect-square"
                      title="Remove from wishlist"
                    >
                      {actionLoading === `remove-${fav.product_id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
