import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { logger } from "@/lib/logger";
import { RelatedProducts } from "@/components/RelatedProducts";
import { ReviewForm } from "@/components/ReviewForm";
import { ReviewsList } from "@/components/ReviewsList";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SocialShare } from "@/components/SocialShare";
import { StockIndicator } from "@/components/StockIndicator";
import { StickyAddToCart } from "@/components/StickyAddToCart";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { TrustBadges } from "@/components/TrustBadges";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingCart,
  Heart,
  Minus,
  Plus,
  Ruler,
  ZoomIn,
  X,
  ChevronLeft,
  ChevronRight,
  Truck,
  Shield,
  RotateCcw,
  Star,
  Check,
  Package,
  Sparkles
} from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCart } from "@/hooks/useCart";
import { useFavorites } from "@/hooks/useFavorites";
import { motion, AnimatePresence } from "framer-motion";
import {
  generateProductSchema,
  generateBreadcrumbSchema,
  createStructuredDataScript
} from "@/lib/structuredData";
import { SEOHead } from "@/components/SEOHead";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProductRecommendations } from "@/components/ProductRecommendations";
import { useProductView } from "@/hooks/useProductView";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart: addToCartDb } = useCart();
  const { isFavorite, toggleFavorite, loading: favoritesLoading } = useFavorites();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("M");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [reviewRefreshTrigger, setReviewRefreshTrigger] = useState(0);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [aggregateRating, setAggregateRating] = useState<{ rating: number; count: number } | undefined>();
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);

  useProductView(id);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          toast.error("Product not found");
          setProduct(null);
        } else {
          setProduct(data);

          const { data: imagesData, error: imagesError } = await supabase
            .from("product_images")
            .select("image_url")
            .eq("product_id", id)
            .order("position", { ascending: true });

          if (!imagesError && imagesData && imagesData.length > 0) {
            const imageUrls = imagesData.map(img => img.image_url);
            setProductImages(imageUrls);
          } else {
            setProductImages(data.image_url ? [data.image_url] : []);
          }

          const { data: variantsData, error: variantsError } = await supabase
            .from("product_variants")
            .select("*")
            .eq("product_id", id);

          if (!variantsError && variantsData) {
            setVariants(variantsData);
            const defaultVariant = variantsData.find(v => v.stock > 0) || variantsData[0];
            if (defaultVariant) {
              setSelectedVariant(defaultVariant);
              setSelectedSize(defaultVariant.size || "M");
            }
          }
        }
      } catch (error) {
        logger.error("Error fetching product", error);
        toast.error("Failed to load product");
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!product) return;

    const fetchStructuredData = async () => {
      try {
        const { data: reviews } = await supabase
          .from("reviews")
          .select("rating")
          .eq("product_id", product.id);

        if (reviews && reviews.length > 0) {
          const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
          setAggregateRating({ rating: avgRating, count: reviews.length });
        }
      } catch (error) {
        logger.error("Error fetching structured data", error);
      }
    };

    fetchStructuredData();
  }, [product]);

  useEffect(() => {
    if (!product) return;

    const baseUrl = "https://luxee-store.vercel.app";

    const productSchema = generateProductSchema(
      product,
      productImages,
      aggregateRating
    );

    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: "Home", url: baseUrl },
      { name: "Products", url: `${baseUrl}/products` },
      { name: product.category, url: `${baseUrl}/products?category=${product.category}` },
      { name: product.name }
    ]);

    const productScript = createStructuredDataScript(productSchema, "product-schema");
    const breadcrumbScript = createStructuredDataScript(breadcrumbSchema, "breadcrumb-schema");

    document.head.appendChild(productScript);
    document.head.appendChild(breadcrumbScript);

    return () => {
      document.getElementById("product-schema")?.remove();
      document.getElementById("breadcrumb-schema")?.remove();
    };
  }, [product, productImages, aggregateRating]);

  const handleAddToCart = async () => {
    if (!product) {
      toast.error("Product not available");
      return;
    }

    const availableStock = selectedVariant ? selectedVariant.stock : product.stock;

    if (availableStock <= 0) {
      toast.error("This product is out of stock");
      return;
    }

    if (quantity > availableStock) {
      toast.error(`Only ${availableStock} items available in stock`);
      return;
    }

    if (variants.length > 0 && !selectedVariant) {
      toast.error("Please select size and color");
      return;
    }

    setAddingToCart(true);

    try {
      await addToCartDb(product.id, selectedVariant?.id || null, quantity);
      setAddedToCart(true);
      toast.success(`Added ${quantity} item(s) to cart`);
      setTimeout(() => setAddedToCart(false), 2000);
    } catch (error) {
      logger.error("Error adding to cart", error);
      toast.error("Failed to add item to cart. Please try again.");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) {
      setQuantity(1);
      return;
    }

    const availableStock = selectedVariant ? selectedVariant.stock : product.stock;

    if (product && newQuantity > availableStock) {
      toast.error(`Only ${availableStock} items available`);
      setQuantity(availableStock);
      return;
    }

    setQuantity(newQuantity);
  };

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    const matchingVariant = variants.find(v => v.size === size);
    setSelectedVariant(matchingVariant || null);
  };

  const availableSizes = variants.length > 0
    ? [...new Set(variants.map(v => v.size).filter(Boolean))]
    : ["XS", "S", "M", "L", "XL", "XXL"];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16 flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            </div>
            <p className="text-muted-foreground font-medium">Loading product...</p>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16 flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center">
              <Package className="w-12 h-12 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
              <p className="text-muted-foreground">The product you're looking for doesn't exist or has been removed.</p>
            </div>
            <Button onClick={() => navigate("/products")} size="lg" className="gradient-primary">
              Browse Products
            </Button>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='533' viewBox='0 0 400 533'%3E%3Crect fill='%23e5e7eb' width='400' height='533'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";
  const mainImage = productImages.length > 0 ? productImages[selectedImageIndex] : FALLBACK_IMAGE;

  const displayPrice = selectedVariant && selectedVariant.price_adjustment
    ? product.price + parseFloat(selectedVariant.price_adjustment)
    : product.price;

  const displayStock = selectedVariant ? selectedVariant.stock : product.stock;

  const hasDiscount = product.sale_price && product.sale_price < product.price;
  const finalPrice = hasDiscount ? product.sale_price : displayPrice;
  const discountPercent = hasDiscount ? Math.round((1 - product.sale_price / product.price) * 100) : 0;

  const productStructuredData = generateProductSchema(
    {
      id: product.id,
      name: product.name,
      description: product.description,
      price: finalPrice,
      image_url: mainImage !== FALLBACK_IMAGE ? mainImage : null,
      stock: displayStock,
    },
    productImages.slice(1),
    aggregateRating
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title={`${product.name} | LUXE Premium Fashion`}
        description={product.description || `Shop ${product.name} at LUXE. Premium ${product.category} fashion with free shipping on orders over $100.`}
        keywords={`${product.name}, ${product.category}, luxury fashion, premium clothing, buy online`}
        canonicalUrl={`/products/${product.id}`}
        ogImage={mainImage !== FALLBACK_IMAGE ? mainImage : undefined}
        ogType="product"
        structuredData={productStructuredData}
      />
      <Navigation />

      <main className="flex-1">
        {/* Breadcrumbs */}
        <div className="container mx-auto px-4 pt-6">
          <Breadcrumbs productName={product.name} category={product.category} />
        </div>

        {/* Product Section */}
        <section className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">

            {/* Image Gallery */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              {/* Main Image */}
              <div
                className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted group cursor-zoom-in shadow-lg"
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                onClick={() => setIsZoomOpen(true)}
                role="button"
                tabIndex={0}
                aria-label="Click to zoom image"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setIsZoomOpen(true);
                  }
                }}
              >
                {/* Badges */}
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                  {product.is_new_arrival && (
                    <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 shadow-lg">
                      <Sparkles className="w-3 h-3 mr-1" />
                      New Arrival
                    </Badge>
                  )}
                  {hasDiscount && (
                    <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white border-0 shadow-lg">
                      -{discountPercent}% OFF
                    </Badge>
                  )}
                </div>

                {/* Favorite Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!product || favoritesLoading) return;
                    toggleFavorite(product.id);
                  }}
                  className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                  aria-label={isFavorite(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <Heart className={`w-5 h-5 transition-colors ${isFavorite(product.id) ? 'fill-rose-500 text-rose-500' : 'text-gray-600'}`} />
                </button>

                <img
                  src={mainImage}
                  alt={`${product.name} - Image ${selectedImageIndex + 1}`}
                  className="h-full w-full object-cover transition-transform duration-500"
                  style={{
                    transform: isHovering ? `scale(1.5)` : 'scale(1)',
                    transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`
                  }}
                  loading="eager"
                />

                {/* Zoom Hint */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/10">
                  <div className="bg-white/95 backdrop-blur-sm px-5 py-3 rounded-xl flex items-center gap-2 shadow-xl">
                    <ZoomIn className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Click to zoom</span>
                  </div>
                </div>

                {/* Image Navigation Arrows */}
                {productImages.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex(prev => prev > 0 ? prev - 1 : productImages.length - 1);
                      }}
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex(prev => prev < productImages.length - 1 ? prev + 1 : 0);
                      }}
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {productImages.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {productImages.map((image, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-24 rounded-xl overflow-hidden border-2 transition-all ${selectedImageIndex === index
                          ? 'border-primary ring-2 ring-primary/30 ring-offset-2'
                          : 'border-transparent hover:border-primary/50'
                        }`}
                      aria-label={`View image ${index + 1}`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} thumbnail ${index + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Fullscreen Zoom Modal */}
              <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
                <DialogContent className="max-w-7xl w-full h-[90vh] p-0 bg-black/95">
                  <DialogHeader className="sr-only">
                    <DialogTitle>Product Image Zoom</DialogTitle>
                    <DialogDescription>Zoomed view of {product.name}</DialogDescription>
                  </DialogHeader>
                  <div className="relative h-full w-full">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white"
                      onClick={() => setIsZoomOpen(false)}
                      aria-label="Close zoom view"
                    >
                      <X className="h-6 w-6" />
                    </Button>

                    {productImages.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 text-white h-12 w-12"
                          onClick={() => setSelectedImageIndex(prev => prev > 0 ? prev - 1 : productImages.length - 1)}
                          aria-label="Previous image"
                        >
                          <ChevronLeft className="h-8 w-8" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 text-white h-12 w-12"
                          onClick={() => setSelectedImageIndex(prev => prev < productImages.length - 1 ? prev + 1 : 0)}
                          aria-label="Next image"
                        >
                          <ChevronRight className="h-8 w-8" />
                        </Button>
                      </>
                    )}

                    <img
                      src={mainImage}
                      alt={`${product.name} - Zoomed view`}
                      className="h-full w-full object-contain"
                    />

                    {productImages.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm">
                        {selectedImageIndex + 1} / {productImages.length}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </motion.div>

            {/* Product Info */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-6"
            >
              {/* Category & Title */}
              <div>
                <p className="text-sm text-primary font-semibold uppercase tracking-widest mb-3">
                  {product.category}
                </p>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                  {product.name}
                </h1>

                {/* Rating */}
                {aggregateRating && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${star <= Math.round(aggregateRating.rating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-300'
                            }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {aggregateRating.rating.toFixed(1)} ({aggregateRating.count} reviews)
                    </span>
                  </div>
                )}

                {/* Price */}
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-4xl font-bold text-foreground">
                    ${finalPrice.toFixed(2)}
                  </span>
                  {hasDiscount && (
                    <>
                      <span className="text-xl text-muted-foreground line-through">
                        ${product.price.toFixed(2)}
                      </span>
                      <Badge variant="destructive" className="text-sm">
                        Save ${(product.price - product.sale_price).toFixed(2)}
                      </Badge>
                    </>
                  )}
                </div>

                <StockIndicator stock={displayStock} />
              </div>

              {/* Description */}
              <p className="text-muted-foreground leading-relaxed text-lg">
                {product.description || "Experience premium quality with this carefully crafted piece. Designed for comfort and style, perfect for any occasion."}
              </p>

              {/* Size Selection */}
              {(product.category === "Clothing" || variants.length > 0) && availableSizes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">
                      Select Size
                    </h3>
                    <Dialog open={sizeGuideOpen} onOpenChange={setSizeGuideOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                          <Ruler className="h-4 w-4 mr-2" />
                          Size Guide
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Size Guide</DialogTitle>
                          <DialogDescription>
                            Find your perfect fit with our comprehensive sizing chart
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="border-b bg-muted/50">
                                <tr>
                                  <th className="text-left py-3 px-4 font-semibold">Size</th>
                                  <th className="text-left py-3 px-4 font-semibold">Chest</th>
                                  <th className="text-left py-3 px-4 font-semibold">Waist</th>
                                  <th className="text-left py-3 px-4 font-semibold">Hips</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { size: 'XS', chest: '32-34', waist: '24-26', hips: '34-36' },
                                  { size: 'S', chest: '34-36', waist: '26-28', hips: '36-38' },
                                  { size: 'M', chest: '36-38', waist: '28-30', hips: '38-40' },
                                  { size: 'L', chest: '38-40', waist: '30-32', hips: '40-42' },
                                  { size: 'XL', chest: '40-42', waist: '32-34', hips: '42-44' },
                                  { size: 'XXL', chest: '42-44', waist: '34-36', hips: '44-46' },
                                ].map((row) => (
                                  <tr key={row.size} className="border-b last:border-0">
                                    <td className="py-3 px-4 font-medium">{row.size}</td>
                                    <td className="py-3 px-4">{row.chest}"</td>
                                    <td className="py-3 px-4">{row.waist}"</td>
                                    <td className="py-3 px-4">{row.hips}"</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="bg-muted/50 p-4 rounded-xl">
                            <h4 className="font-semibold mb-2">How to Measure</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              <li><strong>Chest:</strong> Measure around the fullest part of your chest</li>
                              <li><strong>Waist:</strong> Measure around the narrowest part of your waist</li>
                              <li><strong>Hips:</strong> Measure around the fullest part of your hips</li>
                            </ul>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map((size) => {
                      const sizeVariants = variants.filter(v => v.size === size);
                      const isOutOfStock = sizeVariants.length > 0 && sizeVariants.every(v => v.stock <= 0);
                      const isSelected = selectedSize === size;

                      return (
                        <Button
                          key={size}
                          variant={isSelected ? "default" : "outline"}
                          size="lg"
                          className={`h-12 min-w-[60px] font-medium transition-all ${isSelected
                              ? 'gradient-primary shadow-lg scale-105'
                              : 'hover:border-primary hover:text-primary'
                            } ${isOutOfStock ? 'opacity-50 line-through' : ''}`}
                          onClick={() => handleSizeChange(size)}
                          disabled={isOutOfStock}
                          aria-pressed={isSelected}
                        >
                          {size}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Quantity</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border-2 rounded-xl overflow-hidden">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-12 w-12 rounded-none hover:bg-muted"
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-16 text-center font-semibold text-lg" aria-live="polite">
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-12 w-12 rounded-none hover:bg-muted"
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={quantity >= displayStock}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {displayStock < 10 && displayStock > 0 && (
                    <span className="text-sm font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-full">
                      Only {displayStock} left!
                    </span>
                  )}
                </div>
              </div>

              {/* Add to Cart Button */}
              <div className="space-y-4 pt-4">
                <Button
                  id="main-add-to-cart"
                  size="lg"
                  className={`w-full h-14 text-lg font-semibold rounded-xl transition-all ${addedToCart
                      ? 'bg-emerald-500 hover:bg-emerald-600'
                      : 'gradient-primary btn-glow hover:shadow-xl'
                    }`}
                  onClick={handleAddToCart}
                  disabled={addingToCart || displayStock <= 0}
                >
                  <AnimatePresence mode="wait">
                    {addingToCart ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center"
                      >
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                        Adding...
                      </motion.div>
                    ) : addedToCart ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center"
                      >
                        <Check className="h-5 w-5 mr-2" />
                        Added to Cart!
                      </motion.div>
                    ) : (
                      <motion.div
                        key="default"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center"
                      >
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        {displayStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>

                <SocialShare productName={product.name} productUrl={`/products/${product.id}`} />
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium">Free Shipping</span>
                  <span className="text-xs text-muted-foreground">Orders $100+</span>
                </div>
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <RotateCcw className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium">Easy Returns</span>
                  <span className="text-xs text-muted-foreground">30-day policy</span>
                </div>
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium">Secure Payment</span>
                  <span className="text-xs text-muted-foreground">SSL encrypted</span>
                </div>
              </div>

              {/* Product Tabs */}
              <div className="pt-6">
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 h-12 rounded-xl bg-muted/50">
                    <TabsTrigger value="details" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Details</TabsTrigger>
                    <TabsTrigger value="shipping" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Shipping</TabsTrigger>
                    <TabsTrigger value="reviews" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Reviews</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="mt-6">
                    <div className="grid gap-3">
                      {['100% Organic Cotton', 'Classic crew neck', 'Regular fit', 'Machine washable', 'Imported'].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-muted-foreground">
                          <Check className="w-4 h-4 text-emerald-500" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="shipping" className="mt-6">
                    <div className="grid gap-3">
                      {[
                        'Free shipping on orders over $100',
                        '30-day return policy',
                        'Ships within 2-3 business days',
                        'Express shipping available'
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-muted-foreground">
                          <Check className="w-4 h-4 text-emerald-500" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="reviews" className="mt-6 space-y-6">
                    {isAuthenticated ? (
                      <div className="space-y-6">
                        <div className="p-6 bg-muted/30 rounded-xl">
                          <h3 className="font-semibold mb-4">Write a Review</h3>
                          <ReviewForm
                            productId={product.id}
                            onReviewSubmitted={() => setReviewRefreshTrigger(prev => prev + 1)}
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-4">Customer Reviews</h3>
                          <ReviewsList
                            productId={product.id}
                            refreshTrigger={reviewRefreshTrigger}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="bg-muted/30 p-8 rounded-xl text-center">
                          <p className="text-muted-foreground mb-4">
                            Please log in to write a review
                          </p>
                          <Button onClick={() => navigate("/auth")} className="gradient-primary">
                            Log In to Review
                          </Button>
                        </div>
                        <div>
                          <h3 className="font-semibold mb-4">Customer Reviews</h3>
                          <ReviewsList
                            productId={product.id}
                            refreshTrigger={reviewRefreshTrigger}
                          />
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </motion.div>
          </div>
        </section>

        <TrustBadges />

        <ProductRecommendations
          currentProductId={product.id}
          title="You May Also Like"
          limit={6}
        />

        <RelatedProducts
          currentProductId={product.id}
          category={product.category}
          price={product.price}
        />

        <RecentlyViewed />
      </main>

      <StickyAddToCart
        productName={product.name}
        price={finalPrice}
        onAddToCart={handleAddToCart}
      />

      <Footer />
    </div>
  );
};

export default ProductDetail;
