import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Heart, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

interface QuickViewProps {
  product: {
    id: number;
    name: string;
    price: number;
    image: string;
    category: string;
    description?: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export const QuickView = ({ product, isOpen, onClose }: QuickViewProps) => {
  const [selectedSize, setSelectedSize] = useState("M");
  const [quantity, setQuantity] = useState(1);
  const sizes = ["XS", "S", "M", "L", "XL"];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-10"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* Product Image */}
          <div className="aspect-square overflow-hidden rounded-lg bg-muted">
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Product Details */}
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                {product.category}
              </p>
              <h2 className="text-2xl font-bold">{product.name}</h2>
              <p className="text-2xl font-bold mt-2">${product.price}</p>
            </div>

            {product.description && (
              <p className="text-sm text-muted-foreground">
                {product.description}
              </p>
            )}

            {/* Size Selection */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Select Size</h3>
              <div className="flex gap-2">
                {sizes.map((size) => (
                  <Button
                    key={size}
                    variant={selectedSize === size ? "default" : "outline"}
                    size="sm"
                    className="h-10 w-12"
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Quantity</h3>
              <div className="flex items-center gap-2 border rounded-lg w-fit">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  -
                </Button>
                <span className="w-12 text-center font-semibold">{quantity}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-4">
              <Button className="w-full gradient-primary btn-glow">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
              </Button>
              <Button variant="outline" className="w-full">
                <Heart className="h-4 w-4 mr-2" />
                Add to Wishlist
              </Button>
              <Link to={`/products/${product.id}`} className="block">
                <Button variant="ghost" className="w-full" onClick={onClose}>
                  View Full Details
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
