import { Link } from "react-router-dom";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { useState } from "react";
import { AlertCircle, Package, ShoppingCart, Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { logger } from "@/lib/logger";

interface DbProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string | null;
  category: string;
  stock?: number;
  onAddToCart?: () => void;
}

// Fallback placeholder image (base64 1x1 gray pixel)
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='533' viewBox='0 0 400 533'%3E%3Crect fill='%23e5e7eb' width='400' height='533'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";

export const DbProductCard = ({ 
  id, 
  name, 
  price, 
  originalPrice,
  imageUrl, 
  category, 
  stock = 10,
  onAddToCart
}: DbProductCardProps) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Validate and format price
  const formattedPrice = (() => {
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      logger.error(`Invalid price for product ${id}: ${price}`);
      return "0.00";
    }
    return numPrice.toFixed(2);
  })();

  // Stock status with better typing
  const getStockStatus = () => {
    if (stock === 0) {
      return {
        label: "Out of Stock",
        color: "bg-red-500/90 text-white",
        available: false
      };
    }
    if (stock <= 5) {
      return {
        label: `Only ${stock} left`,
        color: "bg-amber-500/90 text-white",
        available: true
      };
    }
    return {
      label: "In Stock",
      color: "bg-green-500/90 text-white",
      available: true
    };
  };

  const stockStatus = getStockStatus();
  const { isFavorite, toggleFavorite, loading } = useFavorites();

  // Handle image loading
  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  // Determine which image to show
  const displayImage = imageError || !imageUrl ? FALLBACK_IMAGE : imageUrl;

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    await toggleFavorite(id);
  };

  return (
    <Card 
      className="card-modern border-0 overflow-hidden group gradient-card h-full flex flex-col"
      role="article"
      aria-label={`${name} product card`}
    >
      {/* Image Section */}
      <Link 
        to={`/product/${id}`}
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
            className={`h-full w-full object-cover transition-all duration-700 group-hover:scale-110 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
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
          <div 
            className={`absolute top-3 right-3 text-xs px-3 py-1.5 rounded-full font-semibold ${stockStatus.color} backdrop-blur-md shadow-lg flex items-center gap-1.5`}
            aria-label={`Stock status: ${stockStatus.label}`}
          >
            {stock === 0 ? (
              <AlertCircle className="h-3 w-3" aria-hidden="true" />
            ) : (
              <Package className="h-3 w-3" aria-hidden="true" />
            )}
            {stockStatus.label}
          </div>

          {/* Favorite Button */}
          <button
            onClick={handleToggleFavorite}
            disabled={loading}
            className="absolute top-3 left-3 p-2.5 rounded-full glass-card hover:scale-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label={isFavorite(id) ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={isFavorite(id)}
          >
            <Heart 
              className={`h-5 w-5 transition-all ${
                isFavorite(id) ? "fill-primary text-primary scale-110" : "text-foreground"
              }`}
              aria-hidden="true"
            />
          </button>

          {/* Hover Buttons - Only show if in stock */}
          {stockStatus.available && onAddToCart && (
            <div 
              className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0 flex gap-2"
            >
              <Button 
                size="sm" 
                onClick={(e) => {
                  e.preventDefault();
                  onAddToCart();
                }}
                className="flex-1 gradient-primary btn-glow"
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                Add to Cart
              </Button>
            </div>
          )}

          {/* Out of stock overlay */}
          {!stockStatus.available && (
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
          <div className="flex-shrink-0 text-right">
            <p className="font-bold text-xl text-gradient whitespace-nowrap">
              ${formattedPrice}
            </p>
            {originalPrice && originalPrice > price && (
              <p className="text-sm text-muted-foreground line-through whitespace-nowrap">
                ${originalPrice.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {/* Additional Info - Optional section for future enhancements */}
        {stock > 0 && stock <= 5 && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Hurry! Limited stock available
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
