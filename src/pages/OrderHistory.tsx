import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Package, Truck, CheckCircle, Clock, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { ReviewForm } from "@/components/ReviewForm";
import { useOrderTracking } from "@/hooks/useOrderTracking";
import { OrderTrackingBadge } from "@/components/OrderTrackingBadge";
import { RealtimeIndicator } from "@/components/RealtimeIndicator";

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  color: string | null;
  size: string | null;
}

interface Order {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  total_amount: number;
  order_items: OrderItem[];
}

const OrderHistory = () => {
  const [reviewingProduct, setReviewingProduct] = useState<{ id: string; name: string } | null>(null);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  // Get user ID and enable real-time tracking
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  // Enable real-time order tracking with notifications
  useOrderTracking(userId);

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ["user-orders", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(*)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
  });

  // Refetch orders when realtime updates occur
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('order-refetch-listener')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refetch]);

  const getStatusDetails = (status: string) => {
    const statuses: Record<string, { label: string; icon: JSX.Element; variant: "secondary" | "default"; className?: string }> = {
      pending: {
        label: "Processing",
        icon: <Clock className="h-4 w-4" />,
        variant: "secondary",
      },
      processing: {
        label: "Processing",
        icon: <Clock className="h-4 w-4" />,
        variant: "secondary",
      },
      shipped: {
        label: "In Transit",
        icon: <Truck className="h-4 w-4" />,
        variant: "default",
      },
      delivered: {
        label: "Delivered",
        icon: <CheckCircle className="h-4 w-4" />,
        variant: "default",
        className: "bg-green-500 hover:bg-green-600",
      },
      completed: {
        label: "Completed",
        icon: <CheckCircle className="h-4 w-4" />,
        variant: "default",
        className: "bg-green-500 hover:bg-green-600",
      },
      cancelled: {
        label: "Cancelled",
        icon: <Package className="h-4 w-4" />,
        variant: "secondary",
        className: "bg-red-500 hover:bg-red-600",
      },
    };
    return statuses[status] || statuses.pending;
  };

  const canReview = (status: string) => {
    return status === "delivered" || status === "completed";
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-3xl animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[30%] rounded-full bg-secondary/10 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] rounded-full bg-accent/5 blur-3xl animate-blob animation-delay-4000" />
      </div>

      <Navigation />

      <div className="container mx-auto px-4 py-12 md:py-20 relative z-10 flex-1">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-12">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">Order History</h1>
              <p className="text-muted-foreground">Track and manage your recent purchases</p>
            </div>
            <RealtimeIndicator isConnected={!!userId} />
          </div>

          {isLoading ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
              </div>
              <p className="text-muted-foreground font-medium">Synced with server...</p>
            </div>
          ) : !orders || orders.length === 0 ? (
            <Card className="glass-card border-dashed border-2 overflow-hidden">
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 mx-auto bg-primary/5 rounded-full flex items-center justify-center mb-6">
                  <Package className="h-10 w-10 text-primary/50" />
                </div>
                <h3 className="text-2xl font-bold mb-2">No orders yet</h3>
                <p className="text-muted-foreground mb-8 text-lg max-w-md mx-auto">
                  Looks like you haven't made any purchases yet. Start shopping to fill your wardrobe with premium items.
                </p>
                <Button asChild size="lg" className="gradient-primary btn-glow rounded-full px-8">
                  <Link to="/products">Start Shopping</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {orders.map((order, index) => {
                const statusDetails = getStatusDetails(order.status);
                return (
                  <div
                    key={order.id}
                    className="glass-card rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="bg-white/40 backdrop-blur-sm p-6 border-b border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-bold font-mono text-primary">{order.order_number}</h3>
                          <span className="text-xs text-muted-foreground bg-white/50 px-2 py-0.5 rounded">
                            {new Date(order.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.order_items.length} {order.order_items.length === 1 ? 'Item' : 'Items'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={statusDetails.variant}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider shadow-sm ${statusDetails.className ? statusDetails.className : ''}`}
                        >
                          {statusDetails.icon}
                          {statusDetails.label}
                        </Badge>
                        <OrderTrackingBadge status={order.status} />
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="space-y-4 mb-6">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-xl hover:bg-white/40 transition-colors">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center border text-muted-foreground text-xs font-bold">
                                {item.product_name.charAt(0)}
                              </div>
                              <div>
                                <span className="font-semibold text-foreground block">{item.product_name}</span>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {(item.size || item.color) && (
                                    <span>
                                      {[item.size, item.color].filter(Boolean).join(" · ")}
                                    </span>
                                  )}
                                  <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">Qty: {item.quantity}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0 pl-14 sm:pl-0">
                              <span className="font-bold text-sm">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                              {canReview(order.status) && (
                                <Dialog open={reviewingProduct?.id === item.product_id} onOpenChange={(open) => {
                                  if (!open) setReviewingProduct(null);
                                }}>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 rounded-full glass-button hover:bg-primary hover:text-white"
                                      onClick={() => setReviewingProduct({ id: item.product_id, name: item.product_name })}
                                    >
                                      <Star className="h-3 w-3 mr-1.5" />
                                      Review
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="glass-card">
                                    <DialogHeader>
                                      <DialogTitle>Review {item.product_name}</DialogTitle>
                                      <DialogDescription>
                                        Share your experience with this product
                                      </DialogDescription>
                                    </DialogHeader>
                                    <ReviewForm
                                      productId={item.product_id || ''}
                                      onReviewSubmitted={() => {
                                        setReviewingProduct(null);
                                      }}
                                    />
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-dashed border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                          <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
                            ${order.total_amount.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                          <Button variant="outline" size="lg" className="flex-1 sm:flex-none glass-button rounded-xl" asChild>
                            <Link to={`/track-order?order=${order.order_number}`}>
                              Track Benefits
                            </Link>
                          </Button>
                          <Button size="lg" className="flex-1 sm:flex-none gradient-primary btn-glow rounded-xl" asChild>
                            <Link to={`/track-order?order=${order.order_number}`}>
                              Track Order
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default OrderHistory;
