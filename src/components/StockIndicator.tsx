import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

interface StockIndicatorProps {
  stock: number;
  showIcon?: boolean;
  size?: "sm" | "default" | "lg";
}

export const StockIndicator = ({ stock, showIcon = true, size = "default" }: StockIndicatorProps) => {
  const getStockStatus = () => {
    if (stock === 0) {
      return {
        label: "Out of Stock",
        variant: "destructive" as const,
        icon: <XCircle className="h-3 w-3" />
      };
    } else if (stock < 5) {
      return {
        label: `Only ${stock} left!`,
        variant: "destructive" as const,
        icon: <AlertCircle className="h-3 w-3" />
      };
    } else if (stock <= 10) {
      return {
        label: "(Low Stock)",
        variant: "destructive" as const,
        icon: <AlertCircle className="h-3 w-3" />
      };
    } else {
      return {
        label: "In Stock",
        variant: "default" as const,
        icon: <CheckCircle className="h-3 w-3" />
      };
    }
  };

  const status = getStockStatus();

  return (
    <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
      {showIcon && status.icon}
      <span>{status.label}</span>
    </Badge>
  );
};
