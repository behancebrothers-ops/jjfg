import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Truck, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const TrackOrder = () => {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setOrderData(null);

    try {
      // First, get the user profile by email to find user_id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.trim())
        .single();

      if (profileError || !profile) {
        toast({
          title: "Order not found",
          description: "No order found with this email address.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Fetch order with matching order_number and user_id
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            product_name,
            quantity,
            price,
            size,
            color
          )
        `)
        .eq("order_number", orderNumber.trim())
        .eq("user_id", profile.id)
        .single();

      if (orderError || !order) {
        toast({
          title: "Order not found",
          description: "No order found with this order number and email.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Fetch shipment data if available
      const { data: shipment } = await supabase
        .from("shipments")
        .select("*")
        .eq("order_id", order.id)
        .maybeSingle();

      setOrderData({
        ...order,
        shipment,
      });
    } catch (error) {
      console.error("Error tracking order:", error);
      toast({
        title: "Error",
        description: "Failed to track order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-6 w-6 text-yellow-500" />;
      case "processing":
        return <Package className="h-6 w-6 text-blue-500" />;
      case "shipped":
        return <Truck className="h-6 w-6 text-orange-500" />;
      case "delivered":
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case "cancelled":
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Package className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-600";
      case "processing":
        return "text-blue-600";
      case "shipped":
        return "text-orange-600";
      case "delivered":
        return "text-green-600";
      case "cancelled":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  const isStepCompleted = (step: string) => {
    if (!orderData) return false;
    const status = orderData.status;
    
    switch (step) {
      case "placed":
        return true;
      case "processing":
        return ["processing", "shipped", "delivered"].includes(status);
      case "shipped":
        return ["shipped", "delivered"].includes(status);
      case "delivered":
        return status === "delivered";
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Track Your Order</h1>
          <p className="text-muted-foreground mb-8">
            Enter your order number and email to track your shipment
          </p>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Order Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTrack} className="space-y-4">
                <div>
                  <label htmlFor="orderNumber" className="block text-sm font-medium mb-2">
                    Order Number
                  </label>
                  <Input
                    id="orderNumber"
                    type="text"
                    placeholder="e.g., #12345"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Tracking..." : "Track Order"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {orderData && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Order Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Order #{orderData.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          Placed on {format(new Date(orderData.created_at), "PPP")}
                        </p>
                      </div>
                      <div className="text-right">
                        {getStatusIcon(orderData.status)}
                        <p className={`text-sm font-medium mt-1 capitalize ${getStatusColor(orderData.status)}`}>
                          {orderData.status}
                        </p>
                      </div>
                    </div>

                    {/* Tracking Information */}
                    {(orderData.tracking_number || orderData.shipment?.tracking_number) && (
                      <div className="border rounded-lg p-4 bg-muted/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Truck className="h-5 w-5 text-primary" />
                          <p className="font-semibold">Tracking Information</p>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Tracking Number: <span className="font-mono font-medium text-foreground">
                            {orderData.tracking_number || orderData.shipment?.tracking_number}
                          </span>
                        </p>
                        {orderData.shipment?.carrier && (
                          <p className="text-sm text-muted-foreground">
                            Carrier: <span className="font-medium text-foreground">{orderData.shipment.carrier}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Order Timeline */}
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-4">Order Timeline</h3>
                      <div className="space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          </div>
                          <div className="flex-grow">
                            <p className="font-medium">Order Placed</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(orderData.created_at), "PPp")}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            {isStepCompleted("processing") ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <Clock className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-grow">
                            <p className={`font-medium ${!isStepCompleted("processing") && "text-muted-foreground"}`}>
                              Processing
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {isStepCompleted("processing") 
                                ? "Your order is being prepared" 
                                : "Waiting to be processed"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            {isStepCompleted("shipped") ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <Clock className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-grow">
                            <p className={`font-medium ${!isStepCompleted("shipped") && "text-muted-foreground"}`}>
                              Shipped
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {orderData.shipped_at 
                                ? format(new Date(orderData.shipped_at), "PPp")
                                : "Awaiting shipment"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            {isStepCompleted("delivered") ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <Clock className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-grow">
                            <p className={`font-medium ${!isStepCompleted("delivered") && "text-muted-foreground"}`}>
                              Delivered
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {orderData.delivered_at 
                                ? format(new Date(orderData.delivered_at), "PPp")
                                : "Not yet delivered"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orderData.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-start border-b pb-4 last:border-0">
                        <div className="flex-grow">
                          <p className="font-medium">{item.product_name}</p>
                          {(item.size || item.color) && (
                            <p className="text-sm text-muted-foreground">
                              {item.size && `Size: ${item.size}`}
                              {item.size && item.color && " • "}
                              {item.color && `Color: ${item.color}`}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                        </div>
                        <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-4 border-t font-semibold">
                      <span>Total Amount</span>
                      <span className="text-lg">${orderData.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Address */}
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    <p>{orderData.shipping_address_line1}</p>
                    {orderData.shipping_address_line2 && <p>{orderData.shipping_address_line2}</p>}
                    <p>
                      {orderData.shipping_city}, {orderData.shipping_state} {orderData.shipping_postal_code}
                    </p>
                    <p>{orderData.shipping_country}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TrackOrder;
