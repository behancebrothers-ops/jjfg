import { Link } from "react-router-dom";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { ShoppingCart, Heart } from "lucide-react";
import { Badge } from "./ui/badge";
import { useFavorites } from "@/hooks/useFavorites";
import { useState, useRef } from "react";
import { logger } from "@/lib/logger";

interface ProductCardProps {
  id: string | number;
  name: string;
  price: number;
  image: string;
  category: string;
  stock?: number;
  onAddToCart?: (productId: string | number) => void;
}

// Fallback image
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='533' viewBox='0 0 400 533'%3E%3Crect fill='%23e5e7eb' width='400' height='533'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";

export const ProductCard = ({
  id,
  name,
  price,
  image,
  category,
  stock = 10,
  onAddToCart
}: ProductCardProps) => {
  const { isFavorite, toggleFavorite, loading } = useFavorites();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  // Ref to prevent race conditions
  const isMountedRef = useRef(true);

  // Validate and format price
  const formattedPrice = (() => {
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      logger.error(`Invalid price for product ${id}: ${price}`);
      return "0.00";
    }
    return numPrice.toFixed(2);
  })();

  // Stock status
  const getStockStatus = () => {
    if (stock === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (stock <= 10) return { label: "(Low Stock)", variant: "destructive" as const };
    return { label: "In Stock", variant: "default" as const };
  };

  const stockStatus = getStockStatus();

  // Toggle favorite with loading state
  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isTogglingFavorite) return;

    setIsTogglingFavorite(true);
    try {
      await toggleFavorite(String(id));
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  // Handle quick add to cart
  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (stock === 0 || isAddingToCart) return;

    setIsAddingToCart(true);

    try {
      if (onAddToCart) {
        await onAddToCart(id);
      } else {
        // Fallback: navigate to product page if no callback provided
        window.location.href = `/products/${id}`;
      }
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Image handlers
  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const displayImage = imageError ? FALLBACK_IMAGE : image;

  return (
    <Card
      className="card-modern border-0 overflow-hidden group gradient-card h-full flex flex-col"
      role="article"
      aria-label={`${name} product card`}
    >
      {/* Image Section */}
      <Link
        to={`/products/${id}`}
        className="block relative"
        aria-label={`View details for ${name}`}
      >
        <div className="aspect-[3/4] overflow-hidden bg-muted/50 relative">
          {/* Loading skeleton */}
          {imageLoading && (
            <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/50 to-muted animate-pulse" />
          )}

          {/* Product Image */}
          <img
            src={displayImage}
            alt={`${name} - ${category}`}
            loading="lazy"
            className={`h-full w-full object-cover transition-all duration-700 group-hover:scale-110 ${imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />

          {/* Hover overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            aria-hidden="true"
          />

          {/* Stock Badge */}
          <Badge
            variant={stockStatus.variant}
            className={`absolute top-3 right-3 backdrop-blur-md ${stockStatus.variant === 'destructive'
                ? 'bg-red-500 hover:bg-red-600 text-white border-none'
                : 'bg-background/80'
              }`}
            aria-label={`Stock status: ${stockStatus.label}`}
          >
            {stockStatus.label}
          </Badge>

          {/* Favorite Button */}
          <button
            onClick={handleToggleFavorite}
            disabled={loading || isTogglingFavorite}
            className="absolute top-3 left-3 p-2.5 rounded-full glass-card hover:scale-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label={isFavorite(String(id)) ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={isFavorite(String(id))}
          >
            <Heart
              className={`h-5 w-5 transition-all ${isFavorite(String(id)) ? "fill-primary text-primary scale-110" : "text-foreground"
                } ${isTogglingFavorite ? "animate-pulse" : ""}`}
              aria-hidden="true"
            />
          </button>

          {/* Quick Add Button - Positioned outside Link to avoid nesting */}
          {stock > 0 && (
            <div
              className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0"
              aria-hidden="true"
            >
              <Button
                size="sm"
                className="w-full gradient-primary btn-glow"
                onClick={handleQuickAdd}
                disabled={isAddingToCart}
              >
                {isAddingToCart ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Quick Add
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Out of stock overlay */}
          {stock === 0 && (
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="bg-red-500 text-white px-6 py-3 rounded-full font-bold text-sm shadow-xl">
                Out of Stock
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Product Info Section */}
      <div className="p-5 space-y-3 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3 flex-1">
          <div className="flex-1 min-w-0">
            {/* Category */}
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">
              {category}
            </p>

            {/* Product Name */}
            <Link
              to={`/products/${id}`}
              className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
            >
              <h3
                className="font-semibold text-lg hover:text-primary transition-colors line-clamp-2 leading-tight"
                title={name}
              >
                {name}
              </h3>
            </Link>
          </div>

          {/* Price */}
          <div className="flex-shrink-0">
            <p className="font-bold text-xl text-gradient whitespace-nowrap">
              ${formattedPrice}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
