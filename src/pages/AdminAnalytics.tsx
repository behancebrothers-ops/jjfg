import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, ShoppingBag, Users, DollarSign, Package, Star } from "lucide-react";
import { format, subDays } from "date-fns";
import { Badge } from "@/components/ui/badge";

const AdminAnalytics = () => {
  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // Get orders data
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", thirtyDaysAgo);

      if (ordersError) throw ordersError;

      // Get total customers
      const { count: totalCustomers, error: customersError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (customersError) throw customersError;

      // Get products
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("*");

      if (productsError) throw productsError;

      // Get top products from order items
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("product_name, quantity, price")
        .gte("created_at", thirtyDaysAgo);

      if (itemsError) throw itemsError;

      // Calculate top products
      const productSales: Record<string, { quantity: number; revenue: number }> = {};
      orderItems?.forEach((item) => {
        if (!productSales[item.product_name]) {
          productSales[item.product_name] = { quantity: 0, revenue: 0 };
        }
        productSales[item.product_name].quantity += item.quantity;
        productSales[item.product_name].revenue += item.price * item.quantity;
      });

      const topProducts = Object.entries(productSales)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Calculate revenue and orders by status
      const totalRevenue = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter((o) => o.status === "pending").length || 0;
      const completedOrders = orders?.filter((o) => o.status === "delivered").length || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Low stock products
      const lowStockProducts = products?.filter((p) => p.stock < 10).slice(0, 5) || [];

      // Get recent reviews
      const { data: recentReviews, error: reviewsError } = await supabase
        .from("reviews")
        .select(`
          *,
          products (name)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (reviewsError) throw reviewsError;

      return {
        totalRevenue,
        totalOrders,
        totalCustomers,
        avgOrderValue,
        pendingOrders,
        completedOrders,
        topProducts,
        lowStockProducts,
        recentReviews,
        totalProducts: products?.length || 0,
      };
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <AdminNavigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Last 30 days performance overview</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${analytics?.totalRevenue.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last 30 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.totalOrders}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analytics?.completedOrders} completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Customers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.totalCustomers}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total registered
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${analytics?.avgOrderValue.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Per order
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Top Products */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Products (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics?.topProducts.map((product, index) => (
                      <div
                        key={product.name}
                        className="flex items-center justify-between pb-3 border-b last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {product.quantity} sold
                            </p>
                          </div>
                        </div>
                        <p className="font-semibold">${product.revenue.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Low Stock Alert */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Low Stock Alert
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics?.lowStockProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between pb-3 border-b last:border-0"
                      >
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.category}</p>
                        </div>
                        <Badge variant={product.stock === 0 ? "destructive" : "secondary"}>
                          {product.stock} left
                        </Badge>
                      </div>
                    ))}
                    {analytics?.lowStockProducts.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        All products have sufficient stock
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Reviews */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Recent Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.recentReviews && analytics.recentReviews.length > 0 ? (
                    analytics.recentReviews.map((review: any) => (
                      <div
                        key={review.id}
                        className="pb-4 border-b last:border-0"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{review.products?.name}</p>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {review.review_text || "No review text"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(review.created_at), "PPp")}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No reviews yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminAnalytics;
