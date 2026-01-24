import { useState, useEffect } from "react";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Zap, Gift, Percent, Sparkles, Clock, Tag, Eye, EyeOff, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/admin/TableSkeleton";

type SaleSettings = {
  id: string;
  sale_navbar_visible: boolean;
  sale_active: boolean;
  sale_title: string | null;
  sale_subtitle: string | null;
};

type SaleBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  cta_text: string;
  cta_link: string;
  bg_gradient: string;
  badge: string | null;
  icon_type: string;
  position: number;
  active: boolean;
};

type Product = {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  stripe_enabled: boolean;
};

const iconOptions = [
  { value: "zap", label: "Flash/Lightning", icon: Zap },
  { value: "gift", label: "Gift", icon: Gift },
  { value: "percent", label: "Discount", icon: Percent },
  { value: "sparkles", label: "Sparkles", icon: Sparkles },
  { value: "clock", label: "Limited Time", icon: Clock },
  { value: "tag", label: "Price Tag", icon: Tag },
];

const gradientOptions = [
  { value: "from-red-500 via-orange-500 to-amber-500", label: "Fire", preview: "bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" },
  { value: "from-slate-900 via-slate-800 to-slate-700", label: "Dark", preview: "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700" },
  { value: "from-pink-500 via-purple-500 to-indigo-500", label: "Purple Dream", preview: "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" },
  { value: "from-emerald-500 via-teal-500 to-cyan-500", label: "Ocean", preview: "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" },
  { value: "from-yellow-400 via-orange-500 to-red-500", label: "Sunset", preview: "bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500" },
  { value: "from-blue-600 via-blue-500 to-cyan-400", label: "Sky", preview: "bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400" },
];

const AdminSale = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SaleSettings | null>(null);
  const [banners, setBanners] = useState<SaleBanner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showBannerDialog, setShowBannerDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState<SaleBanner | null>(null);
  const [bannerFormData, setBannerFormData] = useState({
    title: "",
    subtitle: "",
    cta_text: "Shop Now",
    cta_link: "/sale",
    bg_gradient: "from-red-500 via-orange-500 to-amber-500",
    badge: "",
    icon_type: "zap",
    active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch sale settings
      const { data: settingsData } = await supabase
        .from("sale_settings")
        .select("*")
        .limit(1)
        .single();
      
      if (settingsData) {
        setSettings(settingsData);
      }

      // Fetch banners (admin can see all)
      const { data: bannersData } = await supabase
        .from("sale_banners")
        .select("*")
        .order("position", { ascending: true });
      
      setBanners(bannersData || []);

      // Fetch products with sale prices
      const { data: productsData } = await supabase
        .from("products")
        .select("id, name, price, sale_price, image_url, stripe_enabled")
        .order("name", { ascending: true });
      
      setProducts(productsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load sale data");
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<SaleSettings>) => {
    if (!settings) return;
    
    try {
      const { error } = await supabase
        .from("sale_settings")
        .update(updates)
        .eq("id", settings.id);

      if (error) throw error;
      
      setSettings({ ...settings, ...updates });
      toast.success("Settings updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update settings");
    }
  };

  const toggleProductStripe = async (productId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ stripe_enabled: enabled })
        .eq("id", productId);

      if (error) throw error;
      
      setProducts(products.map(p => 
        p.id === productId ? { ...p, stripe_enabled: enabled } : p
      ));
      toast.success(`Stripe ${enabled ? 'enabled' : 'disabled'} for product`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update product");
    }
  };

  const handleAddBanner = () => {
    setSelectedBanner(null);
    setBannerFormData({
      title: "",
      subtitle: "",
      cta_text: "Shop Now",
      cta_link: "/sale",
      bg_gradient: "from-red-500 via-orange-500 to-amber-500",
      badge: "",
      icon_type: "zap",
      active: true,
    });
    setShowBannerDialog(true);
  };

  const handleEditBanner = (banner: SaleBanner) => {
    setSelectedBanner(banner);
    setBannerFormData({
      title: banner.title,
      subtitle: banner.subtitle || "",
      cta_text: banner.cta_text,
      cta_link: banner.cta_link,
      bg_gradient: banner.bg_gradient,
      badge: banner.badge || "",
      icon_type: banner.icon_type,
      active: banner.active,
    });
    setShowBannerDialog(true);
  };

  const handleDeleteBanner = (banner: SaleBanner) => {
    setSelectedBanner(banner);
    setShowDeleteDialog(true);
  };

  const confirmDeleteBanner = async () => {
    if (!selectedBanner) return;
    
    try {
      const { error } = await supabase
        .from("sale_banners")
        .delete()
        .eq("id", selectedBanner.id);

      if (error) throw error;
      
      setBanners(banners.filter(b => b.id !== selectedBanner.id));
      toast.success("Banner deleted");
      setShowDeleteDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete banner");
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (selectedBanner) {
        const { error } = await supabase
          .from("sale_banners")
          .update(bannerFormData)
          .eq("id", selectedBanner.id);

        if (error) throw error;
        toast.success("Banner updated");
      } else {
        const { error } = await supabase
          .from("sale_banners")
          .insert([{ ...bannerFormData, position: banners.length }]);

        if (error) throw error;
        toast.success("Banner created");
      }
      
      setShowBannerDialog(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save banner");
    }
  };

  const getIconComponent = (iconType: string) => {
    const option = iconOptions.find(o => o.value === iconType);
    return option ? option.icon : Zap;
  };

  const saleProducts = products.filter(p => p.sale_price !== null);

  return (
    <ProtectedAdminRoute>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <AdminNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Sale Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage sales, promotional banners, and Stripe settings
            </p>
          </div>

          {loading ? (
            <TableSkeleton />
          ) : (
            <Tabs defaultValue="settings" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="banners">Banners</TabsTrigger>
                <TabsTrigger value="products">Sale Products</TabsTrigger>
                <TabsTrigger value="stripe">Stripe Control</TabsTrigger>
              </TabsList>

              {/* Settings Tab */}
              <TabsContent value="settings">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Sale Navbar Banner
                      </CardTitle>
                      <CardDescription>
                        Show or hide the promotional banner at the top of your store
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="navbar-visible">Show Sale Banner</Label>
                        <Switch
                          id="navbar-visible"
                          checked={settings?.sale_navbar_visible || false}
                          onCheckedChange={(checked) => updateSettings({ sale_navbar_visible: checked })}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {settings?.sale_navbar_visible 
                          ? "The promotional banner is visible to all visitors" 
                          : "The promotional banner is hidden"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Sale Mode
                      </CardTitle>
                      <CardDescription>
                        Enable or disable the entire sale across your store
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="sale-active">Activate Sale</Label>
                        <Switch
                          id="sale-active"
                          checked={settings?.sale_active || false}
                          onCheckedChange={(checked) => updateSettings({ sale_active: checked })}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {settings?.sale_active 
                          ? "Sale prices are active and visible" 
                          : "Sale prices are hidden from customers"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Default Sale Message</CardTitle>
                      <CardDescription>
                        Customize the default sale title and subtitle
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="sale-title">Sale Title</Label>
                          <Input
                            id="sale-title"
                            value={settings?.sale_title || ""}
                            onChange={(e) => setSettings(s => s ? { ...s, sale_title: e.target.value } : null)}
                            onBlur={() => updateSettings({ sale_title: settings?.sale_title })}
                            placeholder="Flash Sale"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sale-subtitle">Sale Subtitle</Label>
                          <Input
                            id="sale-subtitle"
                            value={settings?.sale_subtitle || ""}
                            onChange={(e) => setSettings(s => s ? { ...s, sale_subtitle: e.target.value } : null)}
                            onBlur={() => updateSettings({ sale_subtitle: settings?.sale_subtitle })}
                            placeholder="Up to 50% OFF — Limited Time Only!"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Banners Tab */}
              <TabsContent value="banners">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Promotional Banners</CardTitle>
                      <CardDescription>
                        Manage rotating banners shown at the top of your store
                      </CardDescription>
                    </div>
                    <Button onClick={handleAddBanner} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Banner
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {banners.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No banners yet. Add your first promotional banner.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Preview</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>CTA</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {banners.map((banner) => {
                            const IconComponent = getIconComponent(banner.icon_type);
                            return (
                              <TableRow key={banner.id}>
                                <TableCell>
                                  <div className={`w-32 h-10 rounded bg-gradient-to-r ${banner.bg_gradient} flex items-center justify-center gap-2 text-white text-xs`}>
                                    <IconComponent className="h-4 w-4" />
                                    {banner.badge && (
                                      <span className="px-1.5 py-0.5 bg-white text-slate-900 rounded text-[10px] font-bold">
                                        {banner.badge}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{banner.title}</p>
                                    <p className="text-xs text-muted-foreground truncate max-w-xs">
                                      {banner.subtitle}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{banner.cta_text}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={banner.active ? "default" : "secondary"}>
                                    {banner.active ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleEditBanner(banner)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteBanner(banner)}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Sale Products Tab */}
              <TabsContent value="products">
                <Card>
                  <CardHeader>
                    <CardTitle>Products on Sale</CardTitle>
                    <CardDescription>
                      Products with sale prices set ({saleProducts.length} products)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {saleProducts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No products on sale. Set sale prices in the Products section.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Original Price</TableHead>
                            <TableHead>Sale Price</TableHead>
                            <TableHead>Discount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {saleProducts.map((product) => {
                            const discount = product.sale_price 
                              ? Math.round((1 - product.sale_price / product.price) * 100)
                              : 0;
                            return (
                              <TableRow key={product.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <img
                                      src={product.image_url || "/placeholder.svg"}
                                      alt={product.name}
                                      className="w-10 h-10 rounded object-cover"
                                    />
                                    <span className="font-medium">{product.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground line-through">
                                  PKR {product.price.toLocaleString()}
                                </TableCell>
                                <TableCell className="font-semibold text-emerald-600">
                                  PKR {product.sale_price?.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="destructive">{discount}% OFF</Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Stripe Control Tab */}
              <TabsContent value="stripe">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Stripe Payment Control
                    </CardTitle>
                    <CardDescription>
                      Enable or disable Stripe payments for individual products
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Stripe Enabled</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <img
                                  src={product.image_url || "/placeholder.svg"}
                                  alt={product.name}
                                  className="w-10 h-10 rounded object-cover"
                                />
                                <span className="font-medium">{product.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {product.sale_price ? (
                                <div className="flex flex-col">
                                  <span className="text-sm text-muted-foreground line-through">
                                    PKR {product.price.toLocaleString()}
                                  </span>
                                  <span className="font-semibold text-emerald-600">
                                    PKR {product.sale_price.toLocaleString()}
                                  </span>
                                </div>
                              ) : (
                                <span>PKR {product.price.toLocaleString()}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={product.stripe_enabled}
                                onCheckedChange={(checked) => toggleProductStripe(product.id, checked)}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Banner Dialog */}
      <Dialog open={showBannerDialog} onOpenChange={setShowBannerDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedBanner ? "Edit Banner" : "Add New Banner"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveBanner} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="banner-title">Title *</Label>
              <Input
                id="banner-title"
                value={bannerFormData.title}
                onChange={(e) => setBannerFormData({ ...bannerFormData, title: e.target.value })}
                placeholder="Flash Sale"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner-subtitle">Subtitle</Label>
              <Input
                id="banner-subtitle"
                value={bannerFormData.subtitle}
                onChange={(e) => setBannerFormData({ ...bannerFormData, subtitle: e.target.value })}
                placeholder="Up to 50% OFF — Limited Time Only!"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cta-text">Button Text</Label>
                <Input
                  id="cta-text"
                  value={bannerFormData.cta_text}
                  onChange={(e) => setBannerFormData({ ...bannerFormData, cta_text: e.target.value })}
                  placeholder="Shop Now"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cta-link">Button Link</Label>
                <Input
                  id="cta-link"
                  value={bannerFormData.cta_link}
                  onChange={(e) => setBannerFormData({ ...bannerFormData, cta_link: e.target.value })}
                  placeholder="/sale"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="badge">Badge (optional)</Label>
              <Input
                id="badge"
                value={bannerFormData.badge}
                onChange={(e) => setBannerFormData({ ...bannerFormData, badge: e.target.value })}
                placeholder="HOT, NEW, LIMITED, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-6 gap-2">
                {iconOptions.map((option) => {
                  const IconComp = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setBannerFormData({ ...bannerFormData, icon_type: option.value })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        bannerFormData.icon_type === option.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <IconComp className="h-5 w-5 mx-auto" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Background Gradient</Label>
              <div className="grid grid-cols-3 gap-2">
                {gradientOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setBannerFormData({ ...bannerFormData, bg_gradient: option.value })}
                    className={`h-10 rounded-lg ${option.preview} border-2 transition-all ${
                      bannerFormData.bg_gradient === option.value
                        ? "border-foreground ring-2 ring-primary"
                        : "border-transparent"
                    }`}
                    title={option.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="banner-active">Active</Label>
              <Switch
                id="banner-active"
                checked={bannerFormData.active}
                onCheckedChange={(active) => setBannerFormData({ ...bannerFormData, active })}
              />
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className={`rounded-lg bg-gradient-to-r ${bannerFormData.bg_gradient} p-4 text-white text-center`}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  {(() => {
                    const IconComp = getIconComponent(bannerFormData.icon_type);
                    return <IconComp className="h-5 w-5" />;
                  })()}
                  {bannerFormData.badge && (
                    <span className="px-2 py-0.5 bg-white text-slate-900 rounded text-xs font-bold">
                      {bannerFormData.badge}
                    </span>
                  )}
                </div>
                <p className="font-bold">{bannerFormData.title || "Banner Title"}</p>
                <p className="text-sm opacity-90">{bannerFormData.subtitle || "Banner subtitle text"}</p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowBannerDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {selectedBanner ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Banner?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the banner "{selectedBanner?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBanner} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedAdminRoute>
  );
};

export default AdminSale;