import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

interface StickyAddToCartProps {
  productName: string;
  price: number;
  onAddToCart: () => void;
}

export const StickyAddToCart = ({ productName, price, onAddToCart }: StickyAddToCartProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const addToCartButton = document.getElementById('main-add-to-cart');
      if (addToCartButton) {
        const rect = addToCartButton.getBoundingClientRect();
        setIsVisible(rect.bottom < 0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50 animate-slide-in-right md:hidden">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{productName}</p>
          <p className="text-lg font-bold">${price}</p>
        </div>
        <Button 
          onClick={onAddToCart}
          className="gradient-primary btn-glow shrink-0"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
      </div>
    </div>
  );
};
