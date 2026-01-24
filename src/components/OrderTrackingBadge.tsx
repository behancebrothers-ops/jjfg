import { Badge } from "@/components/ui/badge";

interface OrderTrackingBadgeProps {
  status: string;
}

export const OrderTrackingBadge = ({ status }: OrderTrackingBadgeProps) => {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "⏳ Pending", variant: "secondary" },
    confirmed: { label: "✅ Confirmed", variant: "default" },
    processing: { label: "⚙️ Processing", variant: "default" },
    shipped: { label: "📦 Shipped", variant: "default" },
    delivered: { label: "🎉 Delivered", variant: "default" },
    cancelled: { label: "❌ Cancelled", variant: "destructive" }
  };

  const config = statusConfig[status] || { label: status, variant: "outline" };

  return (
    <Badge variant={config.variant} className="font-medium">
      {config.label}
    </Badge>
  );
};
