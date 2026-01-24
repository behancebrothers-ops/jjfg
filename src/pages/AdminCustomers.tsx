import { useState } from "react";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Mail, Phone, MapPin, ShoppingBag, Eye } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminCustomers = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);

  // Fetch all customers
  const { data: customers, isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch customer orders when dialog opens
  const { data: customerOrders } = useQuery({
    queryKey: ["customer-orders", selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer?.id) return [];

      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            product_name,
            quantity,
            price
          )
        `)
        .eq("user_id", selectedCustomer.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedCustomer?.id,
  });

  // Filter customers
  const filteredCustomers = customers?.filter((customer) => {
    const query = searchQuery.toLowerCase();
    return (
      customer.email?.toLowerCase().includes(query) ||
      customer.full_name?.toLowerCase().includes(query)
    );
  });

  const handleViewCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setCustomerDialogOpen(true);
  };

  const calculateCustomerStats = (orders: any[]) => {
    if (!orders || orders.length === 0) return { totalOrders: 0, totalSpent: 0, avgOrderValue: 0 };

    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + order.total_amount, 0);
    const avgOrderValue = totalSpent / totalOrders;

    return { totalOrders, totalSpent, avgOrderValue };
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNavigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Customer Management</h1>
          <p className="text-muted-foreground">View and manage all customers</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Search Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Customers ({filteredCustomers?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredCustomers && filteredCustomers.length > 0 ? (
              <div className="space-y-4">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">
                          {customer.full_name || "No Name"}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          <span>{customer.email}</span>
                        </div>
                        {customer.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.city && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{customer.city}, {customer.state}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Joined {format(new Date(customer.created_at), "PPP")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewCustomer(customer)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No customers found
              </p>
            )}
          </CardContent>
        </Card>

        {/* Customer Details Dialog */}
        <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Customer Details</DialogTitle>
            </DialogHeader>

            {selectedCustomer && (
              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="orders">Orders</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Full Name</p>
                        <p className="font-medium">{selectedCustomer.full_name || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{selectedCustomer.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedCustomer.phone || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Member Since</p>
                        <p className="font-medium">
                          {format(new Date(selectedCustomer.created_at), "PPP")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {selectedCustomer.address_line1 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Address</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p>{selectedCustomer.address_line1}</p>
                        {selectedCustomer.address_line2 && <p>{selectedCustomer.address_line2}</p>}
                        <p>
                          {selectedCustomer.city}, {selectedCustomer.state} {selectedCustomer.postal_code}
                        </p>
                        <p>{selectedCustomer.country}</p>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {customerOrders && (() => {
                        const stats = calculateCustomerStats(customerOrders);
                        return (
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Orders</p>
                              <p className="text-2xl font-bold">{stats.totalOrders}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Total Spent</p>
                              <p className="text-2xl font-bold">${stats.totalSpent.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Avg Order</p>
                              <p className="text-2xl font-bold">${stats.avgOrderValue.toFixed(2)}</p>
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="orders" className="space-y-4">
                  {customerOrders && customerOrders.length > 0 ? (
                    customerOrders.map((order) => (
                      <Card key={order.id}>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="font-semibold">Order #{order.order_number}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(order.created_at), "PPP")}
                              </p>
                            </div>
                            <Badge>
                              {order.status}
                            </Badge>
                          </div>

                          <div className="space-y-2 mb-4">
                            {order.order_items?.map((item: any) => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span>
                                  {item.product_name} x{item.quantity}
                                </span>
                                <span>${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="border-t pt-2">
                            <div className="flex justify-between font-semibold">
                              <span>Total</span>
                              <span>${order.total_amount.toFixed(2)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No orders yet
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminCustomers;
