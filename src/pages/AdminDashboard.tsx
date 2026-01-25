import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { motion } from "framer-motion";
import { 
  Package, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  DollarSign,
  ArrowUpRight,
  Clock,
  AlertTriangle,
  BarChart3,
  Activity,
  Zap,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  revenue: number;
  pendingOrders: number;
  lowStockProducts: number;
  todayOrders: number;
  todayRevenue: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  customer_name?: string;
}

interface TopProduct {
  id: string;
  name: string;
  category: string;
  stock: number;
  price: number;
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    revenue: 0,
    pendingOrders: 0,
    lowStockProducts: 0,
    todayOrders: 0,
    todayRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [categoryData, setCategoryData] = useState<{name: string; value: number}[]>([]);
  const [revenueData, setRevenueData] = useState<{date: string; revenue: number; orders: number}[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all stats in parallel
      const [
        productsRes,
        ordersRes,
        profilesRes,
        lowStockRes,
        pendingOrdersRes,
        recentOrdersRes,
        topProductsRes,
      ] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total, created_at, status"),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }).lte("stock", 10),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("id, order_number, total, status, created_at, user_id").order("created_at", { ascending: false }).limit(5),
        supabase.from("products").select("id, name, category, stock, price").order("stock", { ascending: true }).limit(5),
      ]);

      // Calculate revenue and order stats
      const allOrders = ordersRes.data || [];
      const revenue = allOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayOrders = allOrders.filter(o => new Date(o.created_at) >= today);
      const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);

      setStats({
        totalProducts: productsRes.count || 0,
        totalOrders: allOrders.length,
        totalUsers: profilesRes.count || 0,
        revenue,
        pendingOrders: pendingOrdersRes.count || 0,
        lowStockProducts: lowStockRes.count || 0,
        todayOrders: todayOrders.length,
        todayRevenue,
      });

      // Fetch customer names for recent orders
      if (recentOrdersRes.data && recentOrdersRes.data.length > 0) {
        const userIds = [...new Set(recentOrdersRes.data.map(o => o.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const ordersWithNames = recentOrdersRes.data.map(order => ({
          ...order,
          customer_name: profiles?.find(p => p.id === order.user_id)?.full_name || "Guest"
        }));
        setRecentOrders(ordersWithNames);
      } else {
        setRecentOrders([]);
      }

      setTopProducts(topProductsRes.data || []);

      // Fetch category distribution
      const { data: categoryProducts } = await supabase.from("products").select("category");
      if (categoryProducts) {
        const categoryCounts = categoryProducts.reduce((acc, p) => {
          acc[p.category] = (acc[p.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        setCategoryData(Object.entries(categoryCounts).map(([name, value]) => ({ name, value })));
      }

      // Generate revenue chart data (last 7 days)
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayOrders = allOrders.filter(o => {
          const orderDate = new Date(o.created_at);
          return orderDate >= date && orderDate < nextDate;
        });

        last7Days.push({
          date: format(date, "MMM dd"),
          revenue: dayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
          orders: dayOrders.length,
        });
      }
      setRevenueData(last7Days);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "processing": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "shipped": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "cancelled": return "bg-red-500/10 text-red-600 border-red-500/20";
      default: return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <AdminNavigation />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-indigo-500/30">
                  <Activity className="h-7 w-7 text-white" />
                </div>
                Dashboard
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Welcome back! Here's your store performance</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-4 py-2">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                Store Online
              </Badge>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-green-600 border-0 shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/80 flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-9 w-28 bg-white/20" />
                ) : (
                  <>
                    <div className="text-3xl font-bold text-white">
                      PKR {stats.revenue.toLocaleString()}
                    </div>
                    <p className="text-sm text-white/80 mt-2 flex items-center gap-1">
                      <ArrowUpRight className="h-4 w-4" />
                      <span className="font-semibold">PKR {stats.todayRevenue.toLocaleString()}</span> today
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 border-0 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/80 flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <ShoppingCart className="h-4 w-4 text-white" />
                  </div>
                  Total Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-9 w-20 bg-white/20" />
                ) : (
                  <>
                    <div className="text-3xl font-bold text-white">{stats.totalOrders}</div>
                    <p className="text-sm text-white/80 mt-2 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span className="font-semibold">{stats.pendingOrders}</span> pending
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 border-0 shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/30 transition-all hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/80 flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Package className="h-4 w-4 text-white" />
                  </div>
                  Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-9 w-20 bg-white/20" />
                ) : (
                  <>
                    <div className="text-3xl font-bold text-white">{stats.totalProducts}</div>
                    <p className="text-sm text-white/80 mt-2 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-semibold">{stats.lowStockProducts}</span> low stock
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden bg-gradient-to-br from-pink-500 to-rose-600 border-0 shadow-lg shadow-pink-500/20 hover:shadow-xl hover:shadow-pink-500/30 transition-all hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/80 flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-9 w-20 bg-white/20" />
                ) : (
                  <>
                    <div className="text-3xl font-bold text-white">{stats.totalUsers}</div>
                    <p className="text-sm text-white/80 mt-2">Registered users</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Revenue Chart */}
            <Card className="lg:col-span-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-800 dark:text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-500" />
                  Revenue Overview
                </CardTitle>
                <CardDescription className="text-slate-500">Last 7 days performance</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                        labelStyle={{ color: '#334155' }}
                        formatter={(value: number) => [`PKR ${value.toLocaleString()}`, 'Revenue']}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#6366f1" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-800 dark:text-white flex items-center gap-2">
                  <Package className="h-5 w-5 text-violet-500" />
                  Categories
                </CardTitle>
                <CardDescription className="text-slate-500">Product distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-48 w-full" />
                ) : categoryData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {categoryData.map((cat, index) => (
                        <span key={cat.name} className="text-xs text-slate-500 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></span>
                          {cat.name} ({cat.value})
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-48 flex items-center justify-center text-slate-400">
                    No products yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders & Low Stock */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Recent Orders */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-slate-800 dark:text-white flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-blue-500" />
                    Recent Orders
                  </CardTitle>
                  <CardDescription className="text-slate-500">Latest customer orders</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate("/admin/orders")}
                  className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : recentOrders.length > 0 ? (
                  <div className="space-y-3">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-indigo-300 transition-colors">
                        <div className="flex-1">
                          <p className="font-medium text-slate-800 dark:text-white text-sm">{order.order_number}</p>
                          <p className="text-xs text-slate-500">{order.customer_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-emerald-600 text-sm">PKR {Number(order.total).toLocaleString()}</p>
                          <Badge variant="outline" className={`text-xs ${getStatusColor(order.status)}`}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No orders yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Low Stock Alert */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-slate-800 dark:text-white flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Low Stock Alert
                  </CardTitle>
                  <CardDescription className="text-slate-500">Products needing restock</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate("/admin/products")}
                  className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                >
                  Manage
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : topProducts.length > 0 ? (
                  <div className="space-y-3">
                    {topProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                        <div className="flex-1">
                          <p className="font-medium text-slate-800 dark:text-white text-sm truncate">{product.name}</p>
                          <p className="text-xs text-slate-500">{product.category}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-sm ${product.stock <= 10 ? 'text-rose-500' : product.stock <= 50 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {product.stock} units
                          </p>
                          <p className="text-xs text-slate-500">PKR {product.price.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No products yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-800 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-500" />
                Quick Actions
              </CardTitle>
              <CardDescription className="text-slate-500">Manage your store efficiently</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Button 
                  onClick={() => navigate("/admin/products")} 
                  className="h-20 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold"
                >
                  <Package className="mr-2 h-5 w-5" />
                  Products
                </Button>
                <Button 
                  onClick={() => navigate("/admin/orders")} 
                  variant="outline"
                  className="h-20 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Orders
                </Button>
                <Button 
                  onClick={() => navigate("/admin/customers")} 
                  variant="outline"
                  className="h-20 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <Users className="mr-2 h-5 w-5" />
                  Customers
                </Button>
                <Button 
                  onClick={() => navigate("/admin/analytics")} 
                  variant="outline"
                  className="h-20 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
  );
}
