import { useSearchParams, Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Package, Mail, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OrderDetails {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  discount_amount: number;
  shipping_address_line1: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  created_at: string;
  order_items: Array<{
    product_name: string;
    quantity: number;
    price: number;
  }>;
}

const OrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get("order");
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);

  useEffect(() => {
    const verifyAndFetchOrder = async () => {
      const sessionId = searchParams.get("session_id");
      
      if (sessionId) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          const { data, error } = await supabase.functions.invoke('verify-stripe-payment', {
            body: { sessionId },
            headers: { Authorization: `Bearer ${session.access_token}` },
          });

          if (error) throw error;
          if (data?.orderNumber) {
            searchParams.set('order', data.orderNumber);
            searchParams.delete('session_id');
            window.history.replaceState({}, '', `?${searchParams.toString()}`);
          }
        } catch (error) {
          console.error("Payment verification error:", error);
        }
      }

      if (orderNumber) {
        try {
          const { data, error } = await supabase
            .from("orders")
            .select(`*, order_items (product_name, quantity, price)`)
            .eq("order_number", orderNumber)
            .maybeSingle();

          if (error) throw error;
          setOrderDetails(data);
        } catch (error) {
          console.error("Error fetching order:", error);
        }
      }
      setLoading(false);
    };

    verifyAndFetchOrder();
  }, [orderNumber, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
            <p className="text-muted-foreground">
              Thank you for your purchase. Your order has been received and will be delivered soon.
            </p>
          </div>

          {orderDetails ? (
            <>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Order Number</span>
                      <p className="font-semibold">#{orderDetails.order_number}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Status</span>
                      <p className="font-semibold text-green-600 capitalize">{orderDetails.status}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Order Date</span>
                      <p className="font-semibold">
                        {new Date(orderDetails.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Payment Method</span>
                      <p className="font-semibold">Cash on Delivery</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {orderDetails.order_items.map((item, index) => (
                      <div key={index} className="flex justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                        </div>
                        <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${orderDetails.subtotal.toFixed(2)}</span>
                    </div>
                    {orderDetails.discount_amount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-${orderDetails.discount_amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>${orderDetails.shipping_cost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span>${orderDetails.tax_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total</span>
                      <span>${orderDetails.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{orderDetails.shipping_address_line1}</p>
                  <p>
                    {orderDetails.shipping_city}, {orderDetails.shipping_state}{" "}
                    {orderDetails.shipping_postal_code}
                  </p>
                  <p>{orderDetails.shipping_country}</p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="mb-6">
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">
                  Order #{orderNumber || "N/A"} - Details will be available shortly
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <Mail className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1 text-center">Confirmation Email</h3>
                <p className="text-sm text-muted-foreground text-center">
                  We've sent a confirmation email with your order details
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Package className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1 text-center">Track Your Order</h3>
                <p className="text-sm text-muted-foreground text-center">
                  You'll receive tracking information once shipped
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link to="/orders">View Order History</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/products">Continue Shopping</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderSuccess;
