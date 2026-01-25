import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Package, MapPin, CreditCard, Send, Truck, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface OrderDetailsDialogProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShippingAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export const OrderDetailsDialog = ({ orderId, open, onOpenChange }: OrderDetailsDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [isSending, setIsSending] = useState(false);

  const { data: orderDetails, isLoading } = useQuery({
    queryKey: ["order-details", orderId],
    queryFn: async () => {
      if (!orderId) return null;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", order.user_id)
        .maybeSingle();

      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

      if (itemsError) throw itemsError;

      return { order, profile, items };
    },
    enabled: !!orderId && open,
  });

  const handleUpdateOrderStatus = async () => {
    if (!orderId || !newStatus || !orderDetails) return;

    // Validate tracking info for shipped status
    if (newStatus === "shipped" && !trackingNumber) {
      toast({
        title: "Tracking number required",
        description: "Please enter a tracking number for shipped orders.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      // Update order in database
      const updateData: {
        status: string;
        tracking_number?: string;
        shipped_at?: string;
        delivered_at?: string;
      } = { 
        status: newStatus,
      };

      if (newStatus === "shipped") {
        updateData.tracking_number = trackingNumber;
        updateData.shipped_at = new Date().toISOString();
      } else if (newStatus === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Send email notification
      const emailType = newStatus === "shipped" ? "shipped" : newStatus === "delivered" ? "delivered" : null;
      
      if (emailType) {
        // Check user notification preferences
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('email_orders')
          .eq('user_id', orderDetails.order.user_id)
          .maybeSingle();

        // Check if user wants this type of notification
        const shouldSendEmail = prefs?.email_orders !== false;

        if (!shouldSendEmail) {
          toast({
            title: "Status updated",
            description: `Order status updated to ${newStatus}. Customer has disabled email notifications for this update.`,
          });
          
          // Reset form and refresh data
          setNewStatus("");
          setTrackingNumber("");
          setTrackingUrl("");
          queryClient.invalidateQueries({ queryKey: ["order-details", orderId] });
          queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
          return;
        }

        const emailPayload: {
          type: string;
          order_id: string;
          tracking_number?: string;
          tracking_url?: string;
        } = {
          type: emailType,
          order_id: orderId,
        };

        if (emailType === "shipped") {
          emailPayload.tracking_number = trackingNumber;
          if (trackingUrl) {
            emailPayload.tracking_url = trackingUrl;
          }
        }

        const { error: emailError } = await supabase.functions.invoke("send-order-confirmation", {
          body: emailPayload,
        });

        if (emailError) {
          console.error("Email send error:", emailError);
          toast({
            title: "Status updated",
            description: "Order status updated but email notification failed to send.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: `Order marked as ${newStatus} and customer notified via email.`,
          });
        }
      } else {
        toast({
          title: "Status updated",
          description: `Order status updated to ${newStatus}.`,
        });
      }

      // Reset form
      setNewStatus("");
      setTrackingNumber("");
      setTrackingUrl("");

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["order-details", orderId] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });

    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update order status.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Parse shipping address from JSONB
  const getShippingAddress = (): ShippingAddress => {
    if (!orderDetails?.order?.shipping_address) return {};
    const addr = orderDetails.order.shipping_address;
    if (typeof addr === 'object' && addr !== null) {
      return addr as ShippingAddress;
    }
    return {};
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : orderDetails ? (
          <div className="space-y-6">
            {/* Order Overview */}
              <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="text-lg font-semibold">{orderDetails.order.order_number}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {format(new Date(orderDetails.order.created_at), "PPP 'at' p")}
                </p>
              </div>
              <Badge className={
                orderDetails.order.status === "delivered" ? "bg-green-100 text-green-700" :
                orderDetails.order.status === "processing" ? "bg-blue-100 text-blue-700" :
                orderDetails.order.status === "shipped" ? "bg-purple-100 text-purple-700" :
                orderDetails.order.status === "cancelled" ? "bg-red-100 text-red-700" :
                "bg-yellow-100 text-yellow-700"
              }>
                {orderDetails.order.status}
              </Badge>
            </div>

            <Separator />

            {/* Order Items */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Order Items</h3>
              </div>
              <div className="space-y-3">
                {orderDetails.items?.map((item) => (
                  <div key={item.id} className="flex justify-between items-start p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.product_name}</p>
                      {(item.color || item.size) && (
                        <p className="text-sm text-muted-foreground">
                          {item.color && `Color: ${item.color}`}
                          {item.color && item.size && " • "}
                          {item.size && `Size: ${item.size}`}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-semibold">${Number(item.price).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Shipping Address */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Shipping Address</h3>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg space-y-1">
                <p className="font-medium">{orderDetails.profile?.full_name || orderDetails.order.email}</p>
                {(() => {
                  const addr = getShippingAddress();
                  return (
                    <>
                      {addr.line1 && <p className="text-sm">{addr.line1}</p>}
                      {addr.line2 && <p className="text-sm">{addr.line2}</p>}
                      {(addr.city || addr.state || addr.postal_code) && (
                        <p className="text-sm">
                          {addr.city}{addr.city && addr.state && ', '}{addr.state} {addr.postal_code}
                        </p>
                      )}
                      {addr.country && <p className="text-sm">{addr.country}</p>}
                    </>
                  );
                })()}
              </div>
            </div>

            <Separator />

            {/* Payment Summary */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Payment Summary</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${Number(orderDetails.order.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>${Number(orderDetails.order.shipping || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${Number(orderDetails.order.tax || 0).toFixed(2)}</span>
                </div>
                {Number(orderDetails.order.discount) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-${Number(orderDetails.order.discount).toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>${Number(orderDetails.order.total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Tracking Info */}
            {orderDetails.order.tracking_number && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Tracking Information</h3>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Tracking Number: </span>
                    <span className="font-mono">{orderDetails.order.tracking_number}</span>
                  </p>
                  {orderDetails.order.shipped_at && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Shipped on {format(new Date(orderDetails.order.shipped_at), "PPP")}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Notes */}
            {orderDetails.order.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground">{orderDetails.order.notes}</p>
                </div>
              </>
            )}

            {/* Admin Actions */}
            <Separator />
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Send className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Update Order Status & Notify Customer</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="status-select">New Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger id="status-select">
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="processing">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Processing
                        </div>
                      </SelectItem>
                      <SelectItem value="shipped">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          Shipped (Send Email)
                        </div>
                      </SelectItem>
                      <SelectItem value="delivered">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Delivered (Send Email)
                        </div>
                      </SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newStatus === "shipped" && (
                  <>
                    <div>
                      <Label htmlFor="tracking-number">Tracking Number *</Label>
                      <Input
                        id="tracking-number"
                        placeholder="Enter tracking number"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="tracking-url">Tracking URL (Optional)</Label>
                      <Input
                        id="tracking-url"
                        type="url"
                        placeholder="https://tracking.example.com/..."
                        value={trackingUrl}
                        onChange={(e) => setTrackingUrl(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <Button
                  onClick={handleUpdateOrderStatus}
                  disabled={!newStatus || isSending}
                  className="w-full"
                >
                  {isSending ? (
                    "Updating..."
                  ) : newStatus === "shipped" || newStatus === "delivered" ? (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Update Status & Send Email
                    </>
                  ) : (
                    "Update Status"
                  )}
                </Button>

                {(newStatus === "shipped" || newStatus === "delivered") && (
                  <p className="text-xs text-muted-foreground text-center">
                    Customer will receive an email notification with {newStatus === "shipped" ? "tracking" : "delivery"} details.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
