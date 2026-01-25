import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Eye, Package } from "lucide-react";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { OrderDetailsDialog } from "@/components/admin/OrderDetailsDialog";
import { useAdminOrderTracking } from "@/hooks/useAdminOrderTracking";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

const AdminOrders = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const { isAdmin } = useAdminAuth();
  
  // Enable real-time order tracking for admins
  const { recentOrders } = useAdminOrderTracking(isAdmin);
  
  const { data: ordersData = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (ordersError) throw ordersError;
      
      // Fetch profiles separately
      const userIds = [...new Set(ordersData.map(o => o.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      
      if (profilesError) throw profilesError;
      
      // Fetch order items counts
      const orderIds = ordersData.map(o => o.id);
      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("order_id")
        .in("order_id", orderIds);
      
      if (itemsError) throw itemsError;
      
      const itemsCounts = itemsData.reduce((acc, item) => {
        acc[item.order_id] = (acc[item.order_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Combine data
      return ordersData.map(order => ({
        ...order,
        profile: profilesData.find(p => p.id === order.user_id),
        itemsCount: itemsCounts[order.id] || 0,
      }));
    },
  });

  // Refetch orders when realtime updates occur
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-order-refetch')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, refetch]);

  const filteredOrders = ordersData.filter((order) => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <ProtectedAdminRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <AdminNavigation />

        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
              Orders Management
            </h1>
            {isLoading ? (
              <Skeleton className="h-5 w-32" />
            ) : (
              <p className="text-slate-500">{filteredOrders.length} total orders</p>
            )}
          </div>

          {/* Search and Filters */}
          <Card className="p-4 mb-6 shadow-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search orders..." 
                  className="pl-10 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white placeholder:text-slate-400" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                className="px-4 py-2 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </Card>

        {/* Orders Table */}
        <Card className="overflow-hidden shadow-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-16 w-16 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">No orders found</h3>
              <p className="text-slate-500">
                {searchQuery || statusFilter !== "all" 
                  ? "Try adjusting your filters" 
                  : "Orders will appear here once customers make purchases"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Order Number</th>
                    <th className="text-left py-4 px-6 font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Customer</th>
                    <th className="text-left py-4 px-6 font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Items</th>
                    <th className="text-left py-4 px-6 font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Amount</th>
                    <th className="text-left py-4 px-6 font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                    <th className="text-left py-4 px-6 font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                    <th className="text-right py-4 px-4 font-semibold text-slate-500 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="py-4 px-4">
                        <p className="font-medium text-slate-800 dark:text-white">{order.order_number}</p>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-slate-800 dark:text-white">{order.profile?.full_name || "Guest"}</p>
                          <p className="text-sm text-slate-500">{order.profile?.email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-400">{order.itemsCount}</td>
                      <td className="py-4 px-4 font-semibold text-emerald-600 dark:text-emerald-400">PKR {Number(order.total || 0).toLocaleString()}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                          order.status === "completed" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" :
                          order.status === "processing" ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400" :
                          order.status === "shipped" ? "bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400" :
                          order.status === "cancelled" ? "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400" :
                          "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-400">
                        {format(new Date(order.created_at), "MMM dd, yyyy")}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                            onClick={() => {
                              setSelectedOrderId(order.id);
                              setOrderDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <OrderDetailsDialog 
          orderId={selectedOrderId}
          open={orderDialogOpen}
          onOpenChange={setOrderDialogOpen}
        />
      </div>
      </div>
    </ProtectedAdminRoute>
  );
};

export default AdminOrders;
