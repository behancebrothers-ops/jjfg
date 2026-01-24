import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Clock, ShoppingCart, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const AdminAbandonedCarts = () => {
  // Fetch abandoned cart emails
  const { data: abandonedCarts, isLoading } = useQuery({
    queryKey: ["admin-abandoned-carts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("abandoned_cart_emails")
        .select("*")
        .order("email_sent_at", { ascending: false});

      if (error) throw error;

      // Fetch profiles for each abandoned cart
      const enrichedData = await Promise.all(
        data.map(async (cart) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", cart.user_id)
            .single();

          return { ...cart, profile };
        })
      );

      return enrichedData;
    },
  });

  // Calculate statistics
  const stats = {
    totalEmails: abandonedCarts?.length || 0,
    last7Days: abandonedCarts?.filter((cart) => {
      const sentDate = new Date(cart.email_sent_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return sentDate >= sevenDaysAgo;
    }).length || 0,
    totalValue: abandonedCarts?.reduce((sum, cart) => {
      const items = cart.cart_items_snapshot as any[];
      return sum + items.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
    }, 0) || 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNavigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Abandoned Cart Recovery</h1>
          <p className="text-muted-foreground">Track abandoned cart reminder emails</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Emails Sent</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmails}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.last7Days}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Recent emails
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Cart Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                In abandoned carts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Abandoned Carts List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Abandoned Cart Emails</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : abandonedCarts && abandonedCarts.length > 0 ? (
              <div className="space-y-4">
                {abandonedCarts.map((cart) => {
                  const items = cart.cart_items_snapshot as any[];
                  const totalValue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

                  return (
                    <div
                      key={cart.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">
                              {cart.profile?.full_name || "Customer"}
                            </h3>
                            <Badge variant="secondary">
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              {items.length} items
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {cart.profile?.email}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">${totalValue.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">Cart Value</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-3">
                        <p className="text-sm font-medium">Cart Items:</p>
                        <div className="space-y-1">
                          {items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm text-muted-foreground">
                              <span>
                                {item.product_name}
                                {item.size && ` (${item.size})`}
                                {item.color && ` - ${item.color}`}
                              </span>
                              <span>
                                {item.quantity} × ${item.price.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>Email sent</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(cart.email_sent_at), "PPp")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No abandoned cart emails sent yet
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminAbandonedCarts;
