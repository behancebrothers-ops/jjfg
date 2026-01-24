import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sessionStorage, STORAGE_KEYS } from "@/lib/storage";

// Generate a session ID for anonymous users
const getSessionId = () => {
  let sessionId = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
  }
  return sessionId;
};

export const useProductView = (productId: string | undefined) => {
  useEffect(() => {
    if (!productId) return;

    const trackView = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const sessionId = getSessionId();

        // Insert product view
        const { error } = await supabase
          .from("product_views")
          .insert({
            user_id: user?.id || null,
            product_id: productId,
            session_id: sessionId,
          });

        if (error) {
          console.error("Error tracking product view:", error);
        }
      } catch (error) {
        console.error("Error in useProductView:", error);
      }
    };

    // Track after a short delay to avoid counting quick bounces
    const timer = setTimeout(trackView, 2000);

    return () => clearTimeout(timer);
  }, [productId]);
};
