import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { DbProductCard } from "@/components/DbProductCard";
import { useCart } from "@/hooks/useCart";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Zap,
  Flame,
  Percent,
  Gift,
  Sparkles,
  Tag,
  TrendingDown,
  ShoppingBag,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { SEOHead, generateWebPageSchema } from "@/components/SEOHead";

interface SaleProduct {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  sale_ends_at: string | null;
  image_url: string | null;
  category: string;
  stock: number;
  is_featured?: boolean;
  is_new_arrival?: boolean;
}

interface ActiveDiscount {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  applies_to: string;
  minimum_purchase: number | null;
}

export default function Sale() {
  const [saleProducts, setSaleProducts] = useState<SaleProduct[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<SaleProduct[]>([]);
  const [activeDiscounts, setActiveDiscounts] = useState<ActiveDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { addToCart } = useCart();
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 23,
    minutes: 59,
    seconds: 59
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left'
        ? scrollLeft - clientWidth / 2
        : scrollLeft + clientWidth / 2;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    fetchSaleData();

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        } else {
          return { days: 0, hours: 23, minutes: 59, seconds: 59 };
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchSaleData = async () => {
    try {
      setLoading(true);

      const { data: onSale } = await supabase
        .from("products")
        .select("*")
        .not("sale_price", "is", null)
        .gt("stock", 0)
        .order("created_at", { ascending: false })
        .limit(12);

      const { data: featured } = await supabase
        .from("products")
        .select("*")
        .eq("is_featured", true)
        .gt("stock", 0)
        .limit(8);

      const { data: discounts } = await supabase
        .from("discount_codes")
        .select("id, code, description, discount_type, discount_value, applies_to, minimum_purchase")
        .eq("active", true)
        .lte("valid_from", new Date().toISOString())
        .or(`valid_until.is.null,valid_until.gt.${new Date().toISOString()}`)
        .limit(6);

      setSaleProducts(onSale || []);
      setFeaturedProducts(featured || []);
      setActiveDiscounts(discounts || []);

      if (onSale && onSale.length > 0) {
        const firstSaleEnd = onSale.find(p => p.sale_ends_at)?.sale_ends_at;
        if (firstSaleEnd) {
          const endDate = new Date(firstSaleEnd);
          const now = new Date();
          const diff = endDate.getTime() - now.getTime();
          if (diff > 0) {
            setTimeLeft({
              days: Math.floor(diff / (1000 * 60 * 60 * 24)),
              hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
              minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
              seconds: Math.floor((diff % (1000 * 60)) / 1000)
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching sale data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (productId: string) => {
    addToCart(productId, null, 1);
  };

  const calculateDiscount = (price: number, salePrice: number) => {
    return Math.round(((price - salePrice) / price) * 100);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied ${code} to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <motion.div
        key={value}
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-red-500 to-orange-500 text-white rounded-xl w-14 h-14 md:w-16 md:h-16 flex items-center justify-center shadow-lg"
      >
        <span className="text-xl md:text-2xl font-bold">
          {value.toString().padStart(2, '0')}
        </span>
      </motion.div>
      <span className="text-xs text-muted-foreground mt-2 font-medium uppercase tracking-wide">
        {label}
      </span>
    </div>
  );

  return (
    <>
      <SEOHead
        title="Sale - Up to 36% Off Women's Fashion | LUXE"
        description="Shop our exclusive sale with up to 36% off on women's fashion. Limited time deals on premium clothing and accessories. Don't miss out!"
        keywords="sale, discount, women's fashion sale, clearance, deals, fashion offers"
        canonicalUrl="/sale"
        structuredData={generateWebPageSchema({
          name: "Sale | LUXE Premium Fashion",
          description: "Shop our exclusive sale with up to 36% off on women's fashion.",
          url: "https://luxurious-store.vercel.app/sale",
        })}
      />
      <Navigation />

      <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Hero Banner */}
        <section className="relative overflow-hidden bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 py-12 md:py-20">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-30" />

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <Zap className="h-8 w-8 md:h-10 md:w-10 text-white animate-pulse" />
                <Badge className="bg-white/20 text-white border-0 px-4 py-2 text-sm md:text-base">
                  Limited Time Only
                </Badge>
                <Zap className="h-8 w-8 md:h-10 md:w-10 text-white animate-pulse" />
              </div>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-4 tracking-tight">
                MEGA SALE
              </h1>
              <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Real discounts on premium fashion. Shop now and save big!
              </p>

              <div className="flex items-center justify-center gap-2 md:gap-4">
                {timeLeft.days > 0 && (
                  <>
                    <TimeBlock value={timeLeft.days} label="Days" />
                    <span className="text-2xl font-bold text-white/80">:</span>
                  </>
                )}
                <TimeBlock value={timeLeft.hours} label="Hours" />
                <span className="text-2xl font-bold text-white/80">:</span>
                <TimeBlock value={timeLeft.minutes} label="Mins" />
                <span className="text-2xl font-bold text-white/80">:</span>
                <TimeBlock value={timeLeft.seconds} label="Secs" />
              </div>
            </motion.div>
          </div>

          <div className="absolute top-10 left-10 opacity-20">
            <Percent className="h-20 w-20 text-white animate-bounce" />
          </div>
          <div className="absolute bottom-10 right-10 opacity-20">
            <Gift className="h-24 w-24 text-white animate-pulse" />
          </div>
        </section>

        {/* Active Promo Codes - Enhanced Design */}
        {activeDiscounts.length > 0 && (
          <section className="py-10 bg-gradient-to-b from-muted/50 to-background relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(168,85,247,0.08),transparent_50%)]" />
            <div className="container mx-auto px-4 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
              >
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-4 shadow-lg shadow-purple-500/25">
                  <Sparkles className="h-4 w-4" />
                  Active Promo Codes
                  <Sparkles className="h-4 w-4" />
                </div>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Copy these codes and use them at checkout for extra savings!
                </p>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {activeDiscounts.map((discount, index) => (
                  <motion.div
                    key={discount.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="relative group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div
                      className="relative bg-card border-2 border-dashed border-primary/30 hover:border-primary/60 rounded-2xl p-5 cursor-pointer transition-all shadow-sm hover:shadow-lg"
                      onClick={() => handleCopyCode(discount.code)}
                    >
                      {/* Decorative corner */}
                      <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden rounded-tr-2xl">
                        <div className="absolute -top-8 -right-8 w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rotate-45 flex items-end justify-center pb-2">
                          <Percent className="h-4 w-4 text-white rotate-[-45deg]" />
                        </div>
                      </div>

                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40">
                            <Tag className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                          </div>
                          <code className="font-mono font-bold text-lg text-foreground bg-muted px-3 py-1 rounded-lg">
                            {discount.code}
                          </code>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                            {discount.discount_type === 'percentage'
                              ? `${discount.discount_value}%`
                              : `$${discount.discount_value}`}
                          </span>
                          <span className="text-sm font-medium text-muted-foreground">OFF</span>
                        </div>

                        {discount.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {discount.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                          <div className="flex items-center gap-2">
                            {discount.applies_to === 'specific' && (
                              <Badge variant="secondary" className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-0">
                                Select Items
                              </Badge>
                            )}
                            {discount.minimum_purchase && discount.minimum_purchase > 0 && (
                              <span className="text-xs text-muted-foreground">
                                Min. ${discount.minimum_purchase}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm font-medium text-violet-600 dark:text-violet-400">
                            {copiedCode === discount.code ? (
                              <>
                                <Check className="h-4 w-4" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4" />
                                Copy
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Products On Sale Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="h-px flex-1 max-w-24 bg-gradient-to-r from-transparent to-red-500" />
                <Flame className="h-8 w-8 text-red-500" />
                <span className="text-red-600 font-semibold uppercase tracking-widest text-sm">
                  Real Savings
                </span>
                <Flame className="h-8 w-8 text-red-500" />
                <div className="h-px flex-1 max-w-24 bg-gradient-to-l from-transparent to-red-500" />
              </div>

              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                  On Sale Now
                </span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Products with discounted prices. The savings are real!
              </p>
            </motion.div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-[3/4] w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : saleProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {saleProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    {product.sale_price && (
                      <div className="absolute top-2 left-2 z-10">
                        <Badge className="bg-red-500 text-white border-0 shadow-lg">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          {calculateDiscount(product.price, product.sale_price)}% OFF
                        </Badge>
                      </div>
                    )}
                    <DbProductCard
                      id={product.id}
                      name={product.name}
                      price={product.sale_price || product.price}
                      originalPrice={product.sale_price ? product.price : undefined}
                      imageUrl={product.image_url}
                      category={product.category}
                      stock={product.stock}
                      onAddToCart={() => handleAddToCart(product.id)}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No sale products available at the moment.</p>
                <Button asChild>
                  <Link to="/products">Browse All Products</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Featured Products Section - Redesigned as Premium Slider */}
        {featuredProducts.length > 0 && (
          <section className="py-20 md:py-28 bg-[#0f172a] relative overflow-hidden">
            {/* Animated Background Blobs */}
            <div className="absolute inset-0 pointer-events-none">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.15, 0.25, 0.15],
                  x: [0, 50, 0],
                  y: [0, -30, 0]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500 rounded-full blur-[100px]"
              />
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.1, 0.2, 0.1],
                  x: [0, -40, 0],
                  y: [0, 60, 0]
                }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-pink-500 rounded-full blur-[120px]"
              />
            </div>

            <div className="container mx-auto px-4 relative z-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="space-y-4"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest">
                    <Sparkles className="h-3 w-3" />
                    Curated Selection
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                    FEATURED <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">ITEMS</span>
                  </h2>
                  <p className="text-slate-400 max-w-lg">
                    Discover our most coveted pieces, hand-picked for their exceptional quality and timeless style.
                  </p>
                </motion.div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => scroll('left')}
                    className="rounded-full w-12 h-12 border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-white hover:border-amber-500/50 transition-all shadow-lg shadow-black/20"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => scroll('right')}
                    className="rounded-full w-12 h-12 border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-white hover:border-amber-500/50 transition-all shadow-lg shadow-black/20"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </div>
              </div>

              <div
                ref={scrollRef}
                className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {featuredProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="min-w-[280px] sm:min-w-[320px] md:min-w-[350px] snap-start"
                  >
                    <div className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:border-amber-500/30 transition-all duration-500 shadow-xl hover:shadow-amber-500/10">
                      {/* Decorative Gradient Background */}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 group-hover:to-black/30 transition-all" />

                      <div className="p-4">
                        <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-5">
                          {product.sale_price ? (
                            <div className="absolute top-3 left-3 z-10">
                              <Badge className="bg-red-500 text-white border-0 shadow-lg px-2.5 py-1">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                {calculateDiscount(product.price, product.sale_price)}% OFF
                              </Badge>
                            </div>
                          ) : (
                            <div className="absolute top-3 left-3 z-10">
                              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg px-2.5 py-1">
                                <Sparkles className="h-3.5 w-3.5 mr-1" />
                                RARE
                              </Badge>
                            </div>
                          )}

                          <img
                            src={product.image_url || "/placeholder.svg"}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />

                          {/* Overlay on hover */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <Button
                              onClick={() => handleAddToCart(product.id)}
                              className="bg-white text-black hover:bg-amber-500 hover:text-white transition-all font-bold rounded-xl"
                            >
                              <ShoppingBag className="h-4 w-4 mr-2" />
                              Add to Cart
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3 px-1">
                          <div className="flex justify-between items-start gap-4">
                            <h3 className="font-display font-bold text-lg text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                              {product.name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xl font-black text-amber-500">
                              ${product.sale_price || product.price}
                            </span>
                            {product.sale_price && (
                              <span className="text-sm text-slate-500 line-through">
                                ${product.price}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs font-medium text-slate-400 pt-1">
                            <span className="uppercase tracking-widest">{product.category}</span>
                            <span className={product.stock <= 5 ? "text-red-400" : "text-emerald-400"}>
                              {product.stock <= 5 ? `Only ${product.stock} left` : 'In Stock'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />

              <div className="relative z-10">
                <h3 className="text-2xl md:text-4xl font-bold text-white mb-4">
                  Don't Miss These Deals!
                </h3>
                <p className="text-white/90 mb-6 max-w-lg mx-auto">
                  Subscribe to get notified about our exclusive sales and new arrivals.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-3 rounded-full bg-white/20 backdrop-blur-sm text-white placeholder:text-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                  <button className="px-6 py-3 bg-white text-amber-600 font-semibold rounded-full hover:bg-white/90 transition-colors shadow-lg">
                    Subscribe
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}