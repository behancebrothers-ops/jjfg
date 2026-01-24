import { Badge } from "@/components/ui/badge";
import { Flame, Sparkles, Tag, Zap, TrendingUp } from "lucide-react";
import { useMemo } from "react";

interface ProductBadgeProps {
  type: "new" | "sale" | "bestseller" | "limited";
  discount?: number;
  className?: string;
  animated?: boolean;
  size?: "sm" | "md" | "lg";
}

export const ProductBadge = ({ 
  type, 
  discount, 
  className = "",
  animated = true,
  size = "md"
}: ProductBadgeProps) => {
  
  // Validate and format discount
  const formattedDiscount = useMemo(() => {
    if (type !== "sale" || discount === undefined) return null;
    
    const numDiscount = Number(discount);
    if (isNaN(numDiscount) || numDiscount <= 0 || numDiscount > 100) {
      console.warn(`Invalid discount value: ${discount}. Must be between 1-100.`);
      return null;
    }
    
    return Math.round(numDiscount);
  }, [type, discount]);

  // Size configurations
  const sizeClasses = {
    sm: {
      badge: "text-[10px] px-2 py-0.5",
      icon: "h-2.5 w-2.5",
      gap: "gap-0.5"
    },
    md: {
      badge: "text-xs px-2.5 py-1",
      icon: "h-3 w-3",
      gap: "gap-1"
    },
    lg: {
      badge: "text-sm px-3 py-1.5",
      icon: "h-3.5 w-3.5",
      gap: "gap-1.5"
    }
  };

  const sizeConfig = sizeClasses[size];

  // Badge configurations with proper typing
  const badges = {
    new: {
      label: "New",
      icon: <Sparkles className={sizeConfig.icon} aria-hidden="true" />,
      className: "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30 border-0",
      ariaLabel: "New product",
      animation: animated ? "animate-pulse" : ""
    },
    sale: {
      label: formattedDiscount ? `-${formattedDiscount}%` : "Sale",
      icon: <Tag className={sizeConfig.icon} aria-hidden="true" />,
      className: "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md shadow-red-500/30 border-0",
      ariaLabel: formattedDiscount 
        ? `On sale: ${formattedDiscount}% off` 
        : "On sale",
      animation: animated ? "animate-bounce" : ""
    },
    bestseller: {
      label: "Best Seller",
      icon: <Flame className={sizeConfig.icon} aria-hidden="true" />,
      className: "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/30 border-0",
      ariaLabel: "Best seller product",
      animation: animated ? "animate-pulse" : ""
    },
    limited: {
      label: "Limited",
      icon: <Zap className={sizeConfig.icon} aria-hidden="true" />,
      className: "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md shadow-purple-500/30 border-0",
      ariaLabel: "Limited edition product",
      animation: animated ? "animate-pulse" : ""
    }
  };

  // Validate badge type exists
  const badge = badges[type];
  
  if (!badge) {
    console.error(`Invalid badge type: ${type}. Must be one of: new, sale, bestseller, limited`);
    return null;
  }

  // Warning for discount on non-sale badge
  if (discount !== undefined && type !== "sale") {
    console.warn(`Discount prop (${discount}) provided for non-sale badge type (${type}). This will be ignored.`);
  }

  return (
    <Badge 
      className={`
        flex items-center ${sizeConfig.gap} ${sizeConfig.badge}
        ${badge.className} 
        ${badge.animation}
        font-semibold
        transition-all duration-300
        ${className}
      `.trim()}
      aria-label={badge.ariaLabel}
      role="status"
    >
      {badge.icon}
      <span>{badge.label}</span>
    </Badge>
  );
};

// Type guard for runtime validation
export const isValidBadgeType = (type: string): type is "new" | "sale" | "bestseller" | "limited" => {
  return ["new", "sale", "bestseller", "limited"].includes(type);
};

// Helper function to get badge based on product data
export const getBadgeFromProduct = (product: {
  isNew?: boolean;
  onSale?: boolean;
  discount?: number;
  isBestseller?: boolean;
  isLimited?: boolean;
}): ProductBadgeProps | null => {
  // Priority order: sale > limited > bestseller > new
  if (product.onSale) {
    return { type: "sale", discount: product.discount };
  }
  if (product.isLimited) {
    return { type: "limited" };
  }
  if (product.isBestseller) {
    return { type: "bestseller" };
  }
  if (product.isNew) {
    return { type: "new" };
  }
  return null;
};
