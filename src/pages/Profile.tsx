import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Package, MapPin, Edit2, Check, X, Settings, Shield, LogOut, Mail, Phone, Home, Calendar } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileData {
  full_name?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  order_items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    price: number;
  }>;
}

export default function Profile() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<"profile" | "address" | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);
    await Promise.all([
      fetchProfile(session.user.id),
      fetchOrders(session.user.id)
    ]);
    setLoading(false);
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error && error.code === "PGRST116") {
      setTimeout(() => fetchProfile(userId), 500);
    } else if (error) {
      console.error("Error fetching profile:", error);
      toast({ title: "Error", description: "Failed to load profile", variant: "destructive" });
    } else {
      setProfile(data);
    }
  };

  const fetchOrders = async (userId: string) => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        total,
        created_at,
        order_items (
          id,
          product_name,
          quantity,
          price
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
    } else {
      setOrders(data || []);
    }
  };

  const updateProfile = async (updates: Partial<ProfileData>) => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (error) {
      toast({ title: "Error", description: "Failed to save changes", variant: "destructive" });
      setSaving(false);
      return false;
    } else {
      setProfile(prev => ({ ...prev, ...updates } as ProfileData));
      toast({ title: "Success", description: "Changes saved successfully" });
      setEditingSection(null);
      setSaving(false);
      return true;
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await updateProfile({
      full_name: formData.get("full_name") as string,
      phone: formData.get("phone") as string,
    });
  };

  const handleAddressSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await updateProfile({
      address_line1: formData.get("address_line1") as string,
      address_line2: formData.get("address_line2") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      postal_code: formData.get("postal_code") as string,
      country: formData.get("country") as string || "Pakistan",
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-amber-100 text-amber-800 border-amber-200",
      processing: "bg-blue-100 text-blue-800 border-blue-200",
      shipped: "bg-purple-100 text-purple-800 border-purple-200",
      delivered: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM yyyy, hh:mm a");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50/50 to-pink-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-pink-500 animate-pulse" />
            <Loader2 className="h-8 w-8 animate-spin text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-muted-foreground font-medium">Loading your profile...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50/50 to-pink-50">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-20 right-10 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl"
          animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-32 left-10 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl"
          animate={{ y: [0, 20, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>

      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-xl shadow-amber-500/5 border border-white/60">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-amber-500 to-pink-500 flex items-center justify-center shadow-xl shadow-amber-500/30">
                    <User className="h-12 w-12 md:h-14 md:w-14 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-1">
                    {profile?.full_name || "Welcome!"}
                  </h1>
                  <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                    <Mail className="h-4 w-4" />
                    {user?.email}
                  </p>
                  {profile?.phone && (
                    <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2 mt-1">
                      <Phone className="h-4 w-4" />
                      {profile.phone}
                    </p>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/account-settings")}
                    className="bg-white/50 hover:bg-white/80"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="bg-white/50 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 h-14 p-1.5 bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg">
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-medium"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Profile</span>
                </TabsTrigger>
                <TabsTrigger
                  value="orders"
                  className="flex items-center gap-2 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-medium"
                >
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Orders</span>
                  {orders.length > 0 && (
                    <span className="hidden sm:inline ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                      {orders.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="addresses"
                  className="flex items-center gap-2 py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-medium"
                >
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Address</span>
                </TabsTrigger>
              </TabsList>

              {/* PROFILE TAB */}
              <TabsContent value="overview" className="mt-0">
                <Card className="bg-white/70 backdrop-blur-xl border-white/40 shadow-xl rounded-2xl overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100/50 pb-6 bg-gradient-to-r from-amber-50/50 to-pink-50/50">
                    <div>
                      <CardTitle className="text-xl font-display">Personal Information</CardTitle>
                      <CardDescription>Manage your account details</CardDescription>
                    </div>
                    {editingSection !== "profile" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingSection("profile")}
                        className="bg-white/50 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="pt-6">
                    {editingSection === "profile" ? (
                      <form onSubmit={handleProfileSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="full_name" className="font-medium">Full Name</Label>
                            <Input
                              id="full_name"
                              name="full_name"
                              defaultValue={profile?.full_name || ""}
                              placeholder="Your Name"
                              required
                              className="h-12 bg-white/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone" className="font-medium">Phone Number</Label>
                            <Input
                              id="phone"
                              name="phone"
                              type="tel"
                              defaultValue={profile?.phone || ""}
                              placeholder="+92 300 0000000"
                              required
                              className="h-12 bg-white/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <Button
                            type="submit"
                            disabled={saving}
                            className="bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white shadow-lg"
                          >
                            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                            {saving ? "Saving..." : "Save Changes"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEditingSection(null)}
                            disabled={saving}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-amber-50/50 to-transparent p-4 rounded-xl border border-amber-100/50">
                          <Label className="text-muted-foreground text-xs uppercase tracking-wider">Email Address</Label>
                          <p className="font-semibold text-lg mt-1">{user?.email}</p>
                        </div>
                        <div className="bg-gradient-to-br from-pink-50/50 to-transparent p-4 rounded-xl border border-pink-100/50">
                          <Label className="text-muted-foreground text-xs uppercase tracking-wider">Full Name</Label>
                          <p className="font-semibold text-lg mt-1">{profile?.full_name || "Not set"}</p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-50/50 to-transparent p-4 rounded-xl border border-orange-100/50">
                          <Label className="text-muted-foreground text-xs uppercase tracking-wider">Phone Number</Label>
                          <p className="font-semibold text-lg mt-1">{profile?.phone || "Not set"}</p>
                        </div>
                        <div className="bg-gradient-to-br from-rose-50/50 to-transparent p-4 rounded-xl border border-rose-100/50">
                          <Label className="text-muted-foreground text-xs uppercase tracking-wider">Member Since</Label>
                          <p className="font-semibold text-lg mt-1 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {user?.created_at ? format(new Date(user.created_at), "MMM yyyy") : "—"}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Security Quick Link */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4"
                >
                  <Link to="/account-settings">
                    <Card className="bg-gradient-to-r from-amber-500/10 to-pink-500/10 border-amber-200/50 hover:border-amber-300 transition-all cursor-pointer group">
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-pink-500 flex items-center justify-center">
                            <Shield className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold">Security Settings</p>
                            <p className="text-sm text-muted-foreground">Manage 2FA, password, and security preferences</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="group-hover:bg-white/50">
                          Manage →
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              </TabsContent>

              {/* ORDERS TAB */}
              <TabsContent value="orders" className="mt-0">
                <Card className="bg-white/70 backdrop-blur-xl border-white/40 shadow-xl rounded-2xl overflow-hidden">
                  <CardHeader className="border-b border-gray-100/50 pb-6 bg-gradient-to-r from-amber-50/50 to-pink-50/50">
                    <CardTitle className="text-xl font-display">Order History</CardTitle>
                    <CardDescription>Track and manage your orders</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {orders.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-16"
                      >
                        <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Package className="h-10 w-10 text-amber-500" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                          Start shopping to see your orders here
                        </p>
                        <Button
                          onClick={() => navigate("/products")}
                          className="bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white shadow-lg"
                        >
                          Browse Products
                        </Button>
                      </motion.div>
                    ) : (
                      <div className="space-y-4">
                        {orders.map((order, index) => (
                          <motion.div
                            key={order.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="group border border-gray-100 bg-white/50 rounded-2xl p-5 hover:bg-white hover:shadow-lg hover:border-amber-200/50 transition-all duration-300"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                              <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-lg">
                                  #{order.order_number.slice(-3)}
                                </div>
                                <div>
                                  <p className="font-semibold">Order #{order.order_number}</p>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(order.created_at)}
                                  </p>
                                </div>
                              </div>
                              <span className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </div>

                            <div className="space-y-2 mb-4 bg-gray-50/50 rounded-xl p-4">
                              {(order.order_items || []).slice(0, 2).map((item) => (
                                <div key={item.id} className="flex justify-between text-sm items-center">
                                  <span className="text-foreground/80">
                                    {item.product_name} <span className="text-muted-foreground">× {item.quantity}</span>
                                  </span>
                                  <span className="font-medium">Rs. {(Number(item.price) * item.quantity).toLocaleString()}</span>
                                </div>
                              ))}
                              {order.order_items && order.order_items.length > 2 && (
                                <p className="text-xs text-muted-foreground">+{order.order_items.length - 2} more items</p>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <div>
                              <span className="text-xs text-muted-foreground uppercase tracking-wider">Total</span>
                                <p className="font-bold text-xl bg-gradient-to-r from-amber-600 to-pink-600 bg-clip-text text-transparent">
                                  Rs. {Number(order.total).toLocaleString()}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="hover:bg-gradient-to-r hover:from-amber-500 hover:to-pink-500 hover:text-white hover:border-transparent transition-all"
                                asChild
                              >
                                <Link to={`/track-order?order=${order.order_number}`}>View Details</Link>
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ADDRESS TAB */}
              <TabsContent value="addresses" className="mt-0">
                <Card className="bg-white/70 backdrop-blur-xl border-white/40 shadow-xl rounded-2xl overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100/50 pb-6 bg-gradient-to-r from-amber-50/50 to-pink-50/50">
                    <div>
                      <CardTitle className="text-xl font-display">Shipping Address</CardTitle>
                      <CardDescription>Your default delivery location</CardDescription>
                    </div>
                    {editingSection !== "address" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingSection("address")}
                        className="bg-white/50 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        {profile?.address_line1 ? "Edit" : "Add"}
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="pt-6">
                    {editingSection === "address" ? (
                      <form onSubmit={handleAddressSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="address_line1" className="font-medium">Street Address</Label>
                            <Input
                              id="address_line1"
                              name="address_line1"
                              defaultValue={profile?.address_line1 || ""}
                              placeholder="House 123, Street 45"
                              required
                              className="h-12 bg-white/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="address_line2" className="font-medium">Apartment, Suite, etc. (Optional)</Label>
                            <Input
                              id="address_line2"
                              name="address_line2"
                              defaultValue={profile?.address_line2 || ""}
                              placeholder="Apt 4B, Floor 2"
                              className="h-12 bg-white/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="city" className="font-medium">City</Label>
                            <Input
                              id="city"
                              name="city"
                              defaultValue={profile?.city || ""}
                              placeholder="Lahore"
                              required
                              className="h-12 bg-white/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="state" className="font-medium">State / Province</Label>
                            <Input
                              id="state"
                              name="state"
                              defaultValue={profile?.state || ""}
                              placeholder="Punjab"
                              required
                              className="h-12 bg-white/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="postal_code" className="font-medium">Postal Code</Label>
                            <Input
                              id="postal_code"
                              name="postal_code"
                              defaultValue={profile?.postal_code || ""}
                              placeholder="54000"
                              className="h-12 bg-white/50 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="country" className="font-medium">Country</Label>
                            <Input
                              id="country"
                              name="country"
                              defaultValue={profile?.country || "Pakistan"}
                              disabled
                              className="h-12 bg-gray-100/50 border-gray-200 rounded-xl"
                            />
                          </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <Button
                            type="submit"
                            disabled={saving}
                            className="bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white shadow-lg"
                          >
                            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                            {saving ? "Saving..." : "Save Address"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEditingSection(null)}
                            disabled={saving}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="bg-gradient-to-br from-amber-50/30 to-pink-50/30 p-6 rounded-2xl border border-amber-100/50">
                        {profile?.address_line1 ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-pink-500 flex items-center justify-center">
                                <Home className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-lg">{profile.full_name}</h4>
                                <p className="text-sm text-muted-foreground">Default Address</p>
                              </div>
                            </div>
                            <div className="pl-13 space-y-1 text-muted-foreground">
                              <p className="text-foreground font-medium">{profile.address_line1}</p>
                              {profile.address_line2 && <p>{profile.address_line2}</p>}
                              <p>{profile.city}, {profile.state} {profile.postal_code}</p>
                              <p>{profile.country || "Pakistan"}</p>
                              {profile.phone && (
                                <p className="pt-2 flex items-center gap-2">
                                  <Phone className="h-4 w-4" />
                                  {profile.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <MapPin className="h-8 w-8 text-amber-500" />
                            </div>
                            <h3 className="font-semibold mb-2">No address saved</h3>
                            <p className="text-muted-foreground text-sm">Add your shipping address to speed up checkout</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
