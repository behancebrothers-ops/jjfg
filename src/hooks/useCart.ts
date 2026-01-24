import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { localStorage, STORAGE_KEYS } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { cartItemSchema, validateInput } from "@/lib/validation/schemas";

export interface CartItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  product?: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
  };
  variant?: {
    id: string;
    size: string | null;
    color: string | null;
    price_adjustment: number;
  };
}

interface GuestCartItem {
  product_id: string;
  variant_id: string | null;
  quantity: number;
}

// Storage helpers
const getGuestCart = (): GuestCartItem[] => {
  return localStorage.getJSON<GuestCartItem[]>(STORAGE_KEYS.GUEST_CART, []);
};

const saveGuestCart = (items: GuestCartItem[]): void => {
  localStorage.setJSON(STORAGE_KEYS.GUEST_CART, items);
};

const clearGuestCart = (): void => {
  localStorage.removeItem(STORAGE_KEYS.GUEST_CART);
};

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated, isLoading } = useAuth();
  const userId = isAuthenticated && user ? user.id : null;

  const fetchCartItems = useCallback(async (uid: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          id,
          product_id,
          variant_id,
          quantity,
          product:products!cart_items_product_id_fkey (
            id,
            name,
            price,
            image_url
          ),
          variant:product_variants!cart_items_variant_id_fkey (
            id,
            size,
            color,
            price_adjustment
          )
        `)
        .eq("user_id", uid);

      if (error) {
        logger.error("Error fetching cart", error);
        toast.error("Failed to load cart items");
        return;
      }
      
      setCartItems(data || []);
    } catch (error) {
      logger.error("Error fetching cart", error);
      toast.error("Failed to load cart items");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGuestCart = useCallback(async () => {
    try {
      setLoading(true);
      const guestItems = getGuestCart();
      
      if (guestItems.length === 0) {
        setCartItems([]);
        return;
      }

      // Batch fetch products and variants
      const productIds = [...new Set(guestItems.map(item => item.product_id))];
      const variantIds = guestItems
        .map(item => item.variant_id)
        .filter((id): id is string => id !== null);

      const [productsResult, variantsResult] = await Promise.all([
        supabase
          .from("products")
          .select("id, name, price, image_url")
          .in("id", productIds),
        variantIds.length > 0 
          ? supabase
              .from("product_variants")
              .select("id, size, color, price_adjustment")
              .in("id", variantIds)
          : Promise.resolve({ data: [] })
      ]);

      const products = productsResult.data || [];
      const variants = variantsResult.data || [];

      const enrichedItems: CartItem[] = guestItems.map((item, index) => ({
        id: `guest_${index}`,
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        product: products.find(p => p.id === item.product_id),
        variant: variants.find(v => v.id === item.variant_id),
      }));

      setCartItems(enrichedItems);
    } catch (error) {
      logger.error("Error loading guest cart", error);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncGuestCartToDatabase = useCallback(async (uid: string) => {
    const guestItems = getGuestCart();
    if (guestItems.length === 0) return;
    
    try {
      for (const item of guestItems) {
        const query = supabase
          .from("cart_items")
          .select("id, quantity")
          .eq("user_id", uid)
          .eq("product_id", item.product_id);
        
        if (item.variant_id) {
          query.eq("variant_id", item.variant_id);
        } else {
          query.is("variant_id", null);
        }
        
        const { data: existing } = await query.maybeSingle();

        if (existing) {
          await supabase
            .from("cart_items")
            .update({ quantity: existing.quantity + item.quantity })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("cart_items")
            .insert({
              user_id: uid,
              product_id: item.product_id,
              variant_id: item.variant_id,
              quantity: item.quantity,
            });
        }
      }

      clearGuestCart();
      toast.success("Cart synced successfully!");
    } catch (error) {
      logger.error("Error syncing guest cart", error);
    }
  }, []);

  // Initialize cart on auth state change
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const initializeCart = async () => {
      if (isLoading) return;
      
      if (userId) {
        // Sync guest cart if exists
        if (getGuestCart().length > 0) {
          await syncGuestCartToDatabase(userId);
        }
        
        await fetchCartItems(userId);
        
        // Realtime subscription
        channel = supabase
          .channel('cart-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'cart_items',
              filter: `user_id=eq.${userId}`
            },
            () => fetchCartItems(userId)
          )
          .subscribe();
      } else {
        await loadGuestCart();
      }
    };

    initializeCart();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId, isLoading, fetchCartItems, loadGuestCart, syncGuestCartToDatabase]);

  const addToCart = useCallback(async (
    productId: string,
    variantId: string | null = null,
    quantity: number = 1
  ): Promise<boolean> => {
    // Validate input
    const validation = validateInput(cartItemSchema, { productId, variantId, quantity });
    if (!validation.success) {
      toast.error(validation.errors?.[0] || "Invalid input");
      return false;
    }

    try {
      // Verify product exists and check stock
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id, name, stock, price, image_url")
        .eq("id", productId)
        .maybeSingle();

      if (productError || !product) {
        toast.error("Product not found");
        return false;
      }

      let availableStock = product.stock;
      
      if (variantId) {
        const { data: variant, error: variantError } = await supabase
          .from("product_variants")
          .select("id, stock")
          .eq("id", variantId)
          .maybeSingle();

        if (variantError || !variant) {
          toast.error("Variant not found");
          return false;
        }
        availableStock = variant.stock;
      }

      // Guest user flow
      if (!userId) {
        const guestCart = getGuestCart();
        const existingIndex = guestCart.findIndex(
          item => item.product_id === productId && item.variant_id === variantId
        );

        const currentQuantity = existingIndex >= 0 ? guestCart[existingIndex].quantity : 0;
        const newQuantity = currentQuantity + quantity;

        if (newQuantity > availableStock) {
          toast.error(`Only ${availableStock} items available`);
          return false;
        }

        if (existingIndex >= 0) {
          guestCart[existingIndex].quantity = newQuantity;
        } else {
          guestCart.push({ product_id: productId, variant_id: variantId, quantity });
        }

        saveGuestCart(guestCart);
        await loadGuestCart();
        toast.success("Added to cart!");
        return true;
      }

      // Authenticated user flow
      const query = supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", userId)
        .eq("product_id", productId);
      
      if (variantId) {
        query.eq("variant_id", variantId);
      } else {
        query.is("variant_id", null);
      }
      
      const { data: existing } = await query.maybeSingle();
      const newQuantity = (existing?.quantity || 0) + quantity;

      if (newQuantity > availableStock) {
        toast.error(`Only ${availableStock} items available`);
        return false;
      }

      if (existing) {
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cart_items")
          .insert({
            user_id: userId,
            product_id: productId,
            variant_id: variantId,
            quantity,
          });

        if (error) throw error;
      }

      await fetchCartItems(userId);
      toast.success("Added to cart!");
      return true;
    } catch (error) {
      logger.error("Error adding to cart", error);
      toast.error("Failed to add item to cart");
      return false;
    }
  }, [userId, fetchCartItems, loadGuestCart]);

  const updateQuantity = useCallback(async (cartItemId: string, quantity: number) => {
    if (quantity < 1 || quantity > 99) {
      toast.error("Invalid quantity");
      return;
    }

    try {
      // Guest user
      if (!userId && cartItemId.startsWith("guest_")) {
        const guestCart = getGuestCart();
        const index = parseInt(cartItemId.replace("guest_", ""), 10);
        
        if (index >= 0 && index < guestCart.length) {
          const item = guestCart[index];
          
          // Check stock
          const { data: stockData } = item.variant_id
            ? await supabase.from("product_variants").select("stock").eq("id", item.variant_id).maybeSingle()
            : await supabase.from("products").select("stock").eq("id", item.product_id).maybeSingle();
          
          const stock = stockData?.stock || 0;
          if (quantity > stock) {
            toast.error(`Only ${stock} items available`);
            return;
          }

          guestCart[index].quantity = quantity;
          saveGuestCart(guestCart);
          await loadGuestCart();
          toast.success("Quantity updated");
        }
        return;
      }

      // Authenticated user
      const { data: cartItem, error: fetchError } = await supabase
        .from("cart_items")
        .select(`
          product_id,
          variant_id,
          product:products!cart_items_product_id_fkey (stock),
          variant:product_variants!cart_items_variant_id_fkey (stock)
        `)
        .eq("id", cartItemId)
        .maybeSingle();

      if (fetchError || !cartItem) {
        toast.error("Cart item not found");
        return;
      }

      const stock = cartItem.variant?.stock ?? cartItem.product?.stock ?? 0;
      if (quantity > stock) {
        toast.error(`Only ${stock} items available`);
        return;
      }

      const { error } = await supabase
        .from("cart_items")
        .update({ quantity, updated_at: new Date().toISOString() })
        .eq("id", cartItemId);

      if (error) throw error;
      
      if (userId) await fetchCartItems(userId);
      toast.success("Quantity updated");
    } catch (error) {
      logger.error("Error updating quantity", error);
      toast.error("Failed to update quantity");
    }
  }, [userId, fetchCartItems, loadGuestCart]);

  const removeFromCart = useCallback(async (cartItemId: string) => {
    try {
      if (!userId && cartItemId.startsWith("guest_")) {
        const guestCart = getGuestCart();
        const index = parseInt(cartItemId.replace("guest_", ""), 10);
        
        if (index >= 0 && index < guestCart.length) {
          guestCart.splice(index, 1);
          saveGuestCart(guestCart);
          await loadGuestCart();
          toast.success("Item removed");
        }
        return;
      }

      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", cartItemId);

      if (error) throw error;
      
      if (userId) await fetchCartItems(userId);
      toast.success("Item removed");
    } catch (error) {
      logger.error("Error removing from cart", error);
      toast.error("Failed to remove item");
    }
  }, [userId, fetchCartItems, loadGuestCart]);

  const clearCart = useCallback(async () => {
    try {
      if (!userId) {
        clearGuestCart();
        setCartItems([]);
        toast.success("Cart cleared");
        return;
      }

      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;
      
      setCartItems([]);
      toast.success("Cart cleared");
    } catch (error) {
      logger.error("Error clearing cart", error);
      toast.error("Failed to clear cart");
    }
  }, [userId]);

  // Memoized computed values for better performance
  const cartCount = useMemo(() => 
    cartItems.reduce((sum, item) => sum + item.quantity, 0), 
    [cartItems]
  );
  
  const cartTotal = useMemo(() => 
    cartItems.reduce((sum, item) => {
      const price = item.product?.price || 0;
      const adjustment = item.variant?.price_adjustment || 0;
      return sum + (price + adjustment) * item.quantity;
    }, 0),
    [cartItems]
  );

  return {
    cartItems,
    loading,
    cartCount,
    cartTotal,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    refetch: userId ? () => fetchCartItems(userId) : loadGuestCart,
  };
};
