import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { uuidSchema } from "@/lib/validation/schemas";

interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated, isLoading } = useAuth();

  const fetchFavorites = useCallback(async (uid: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (error) {
        logger.error("Error fetching favorites", error);
        toast.error("Failed to load favorites");
        return;
      }
      
      setFavorites(data || []);
    } catch (error) {
      logger.error("Error fetching favorites", error);
      toast.error("Failed to load favorites");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const initializeFavorites = async () => {
      if (isLoading) return;
      
      if (isAuthenticated && user) {
        await fetchFavorites(user.id);
        
        // Realtime subscription
        channel = supabase
          .channel('favorites-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'favorites',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                setFavorites(prev => [...prev, payload.new as Favorite]);
              } else if (payload.eventType === 'DELETE') {
                setFavorites(prev => prev.filter(fav => fav.id !== payload.old.id));
              }
            }
          )
          .subscribe();
      } else {
        setFavorites([]);
        setLoading(false);
      }
    };

    initializeFavorites();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [isAuthenticated, user?.id, isLoading, fetchFavorites]);

  const isFavorite = useCallback((productId: string): boolean => {
    return favorites.some(fav => fav.product_id === productId);
  }, [favorites]);

  const addFavorite = useCallback(async (productId: string): Promise<boolean> => {
    // Validate input
    const validation = uuidSchema.safeParse(productId);
    if (!validation.success) {
      toast.error("Invalid product ID");
      return false;
    }

    if (!isAuthenticated || !user) {
      toast.error("Please login to add favorites");
      return false;
    }

    try {
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, product_id: productId });

      if (error) {
        // Handle duplicate favorite gracefully
        if (error.code === '23505') {
          toast.info("Already in wishlist");
          return true;
        }
        throw error;
      }
      
      toast.success("Added to wishlist");
      return true;
    } catch (error) {
      logger.error("Error adding favorite", error);
      toast.error("Failed to add to wishlist");
      return false;
    }
  }, [isAuthenticated, user]);

  const removeFavorite = useCallback(async (productId: string): Promise<boolean> => {
    if (!isAuthenticated || !user) {
      toast.error("Please login");
      return false;
    }

    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);

      if (error) throw error;
      
      toast.success("Removed from wishlist");
      return true;
    } catch (error) {
      logger.error("Error removing favorite", error);
      toast.error("Failed to remove from wishlist");
      return false;
    }
  }, [isAuthenticated, user]);

  const toggleFavorite = useCallback(async (productId: string): Promise<boolean> => {
    return isFavorite(productId) 
      ? removeFavorite(productId)
      : addFavorite(productId);
  }, [isFavorite, removeFavorite, addFavorite]);

  return {
    favorites,
    loading,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    favoriteCount: favorites.length,
    refetch: user ? () => fetchFavorites(user.id) : () => {},
  };
};
