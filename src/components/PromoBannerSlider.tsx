import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Zap, Gift, Percent, Clock, Sparkles, Tag } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PromoBanner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  background_color: string | null;
  text_color: string | null;
  position: number;
}

interface SaleSettings {
  sale_navbar_visible: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  zap: Zap,
  gift: Gift,
  percent: Percent,
  clock: Clock,
  sparkles: Sparkles,
  tag: Tag,
};

// Fallback banners if no database banners exist
const defaultPromos: PromoBanner[] = [
  {
    id: "1",
    title: "Flash Sale",
    subtitle: "Up to 50% OFF — Limited Time Only!",
    image_url: null,
    link_url: "/sale",
    background_color: "from-red-500 via-orange-500 to-amber-500",
    text_color: null,
    position: 0,
  },
  {
    id: "2",
    title: "New Season Collection",
    subtitle: "Fresh styles just dropped — Be the first to shop",
    image_url: null,
    link_url: "/new-arrivals",
    background_color: "from-pink-500 via-purple-500 to-indigo-500",
    text_color: null,
    position: 1,
  },
  {
    id: "3",
    title: "Free Shipping",
    subtitle: "On all orders over PKR 5,000 — No code needed",
    image_url: null,
    link_url: "/products",
    background_color: "from-emerald-500 via-teal-500 to-cyan-500",
    text_color: null,
    position: 2,
  }
];

export const PromoBannerSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [promos, setPromos] = useState<PromoBanner[]>(defaultPromos);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch sale settings
        const { data: settingsData } = await supabase
          .from("sale_settings")
          .select("sale_navbar_visible")
          .limit(1)
          .maybeSingle();

        if (settingsData) {
          setIsVisible(settingsData.sale_navbar_visible);
        }

        // Fetch active banners
        const { data: bannersData } = await supabase
          .from("sale_banners")
          .select("*")
          .eq("active", true)
          .order("position", { ascending: true });

        if (bannersData && bannersData.length > 0) {
          setPromos(bannersData);
        }
      } catch (error) {
        console.error("Error fetching promo data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to realtime changes
    const settingsChannel = supabase
      .channel('sale-settings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_settings' }, (payload) => {
        if (payload.new && 'sale_navbar_visible' in payload.new) {
          setIsVisible(payload.new.sale_navbar_visible as boolean);
        }
      })
      .subscribe();

    const bannersChannel = supabase
      .channel('sale-banners-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_banners' }, () => {
        // Refetch banners on any change
        supabase
          .from("sale_banners")
          .select("*")
          .eq("active", true)
          .order("position", { ascending: true })
          .then(({ data }) => {
            if (data && data.length > 0) {
              setPromos(data);
            }
          });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(bannersChannel);
    };
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % promos.length);
  }, [promos.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + promos.length) % promos.length);
  }, [promos.length]);

  useEffect(() => {
    if (isPaused || promos.length <= 1) return;
    
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isPaused, nextSlide, promos.length]);

  // Reset index if it's out of bounds
  useEffect(() => {
    if (currentIndex >= promos.length) {
      setCurrentIndex(0);
    }
  }, [promos.length, currentIndex]);

  if (!isVisible || loading || promos.length === 0) {
    return null;
  }

  const currentPromo = promos[currentIndex];
  const bgGradient = currentPromo.background_color || "from-amber-500 to-pink-500";

  return (
    <div 
      className="relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPromo.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.4 }}
          className={`relative bg-gradient-to-r ${bgGradient} py-3 sm:py-4`}
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,white_1px,transparent_1px)] bg-[length:20px_20px]" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="flex items-center justify-between gap-4">
              {/* Left Arrow - Hidden on mobile */}
              {promos.length > 1 && (
                <button
                  onClick={prevSlide}
                  className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
                  aria-label="Previous promotion"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}

              {/* Content */}
              <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-center sm:text-left">
                {/* Icon */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 text-white">
                    <Zap className="h-6 w-6" />
                  </div>
                </div>

                {/* Text */}
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
                  <h3 className="text-sm sm:text-base md:text-lg font-bold text-white whitespace-nowrap">
                    {currentPromo.title}
                  </h3>
                  <span className="hidden sm:block text-white/60">|</span>
                  <p className="text-xs sm:text-sm text-white/90 line-clamp-1">
                    {currentPromo.subtitle}
                  </p>
                </div>

                {/* CTA Button */}
                {currentPromo.link_url && (
                  <Link to={currentPromo.link_url}>
                    <Button
                      size="sm"
                      className="bg-white text-slate-900 hover:bg-white/90 font-semibold shadow-md hover:shadow-lg transition-all text-xs sm:text-sm px-4 py-1.5 rounded-full group"
                    >
                      Shop Now
                      <ChevronRight className="ml-1 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </Link>
                )}
              </div>

              {/* Right Arrow - Hidden on mobile */}
              {promos.length > 1 && (
                <button
                  onClick={nextSlide}
                  className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
                  aria-label="Next promotion"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Dots indicator */}
            {promos.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-2 sm:mt-3">
                {promos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`transition-all duration-300 rounded-full ${
                      index === currentIndex
                        ? "w-6 h-1.5 bg-white"
                        : "w-1.5 h-1.5 bg-white/40 hover:bg-white/60"
                    }`}
                    aria-label={`Go to promotion ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Timer indicator */}
          {!isPaused && promos.length > 1 && (
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 bg-white/50"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 5, ease: "linear" }}
              key={`timer-${currentIndex}`}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
