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
import { Plus, Pencil, Trash2, Zap, Gift, Percent, Sparkles, Clock, Tag, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/admin/TableSkeleton";

type SaleSettings = {
  id: string;
  sale_navbar_visible: boolean | null;
  sale_title: string | null;
  sale_description: string | null;
  sale_end_date: string | null;
};

type SaleBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  background_color: string | null;
  text_color: string | null;
  image_url: string | null;
  link_url: string | null;
  position: number | null;
  active: boolean | null;
};

type Product = {
  id: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  image_url: string | null;
  is_on_sale: boolean | null;
};

const iconOptions = [
  { value: "zap", label: "Flash/Lightning", icon: Zap },
  { value: "gift", label: "Gift", icon: Gift },
  { value: "percent", label: "Discount", icon: Percent },
  { value: "sparkles", label: "Sparkles", icon: Sparkles },
  { value: "clock", label: "Limited Time", icon: Clock },
  { value: "tag", label: "Price Tag", icon: Tag },
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
    background_color: "#ff5555",
    text_color: "#ffffff",
    image_url: "",
    link_url: "/sale",
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
        .maybeSingle();
      
      if (settingsData) {
        setSettings(settingsData);
      }

      // Fetch banners (admin can see all)
      const { data: bannersData } = await supabase
        .from("sale_banners")
        .select("*")
        .order("position", { ascending: true });
      
      setBanners(bannersData || []);

      // Fetch products on sale
      const { data: productsData } = await supabase
        .from("products")
        .select("id, name, price, compare_at_price, image_url, is_on_sale")
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

  const toggleProductSale = async (productId: string, isOnSale: boolean) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_on_sale: isOnSale })
        .eq("id", productId);

      if (error) throw error;
      
      setProducts(products.map(p => 
        p.id === productId ? { ...p, is_on_sale: isOnSale } : p
      ));
      toast.success(`Sale ${isOnSale ? 'enabled' : 'disabled'} for product`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update product");
    }
  };

  const handleAddBanner = () => {
    setSelectedBanner(null);
    setBannerFormData({
      title: "",
      subtitle: "",
      background_color: "#ff5555",
      text_color: "#ffffff",
      image_url: "",
      link_url: "/sale",
      active: true,
    });
    setShowBannerDialog(true);
  };

  const handleEditBanner = (banner: SaleBanner) => {
    setSelectedBanner(banner);
    setBannerFormData({
      title: banner.title,
      subtitle: banner.subtitle || "",
      background_color: banner.background_color || "#ff5555",
      text_color: banner.text_color || "#ffffff",
      image_url: banner.image_url || "",
      link_url: banner.link_url || "/sale",
      active: banner.active ?? true,
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

  const saleProducts = products.filter(p => p.is_on_sale || (p.compare_at_price && p.compare_at_price > p.price));

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
              Manage sales, promotional banners, and product discounts
            </p>
          </div>

          {loading ? (
            <TableSkeleton />
          ) : (
            <Tabs defaultValue="settings" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="banners">Banners</TabsTrigger>
                <TabsTrigger value="products">Sale Products</TabsTrigger>
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

                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Default Sale Message</CardTitle>
                      <CardDescription>
                        Customize the default sale title and description
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
                          <Label htmlFor="sale-description">Sale Description</Label>
                          <Input
                            id="sale-description"
                            value={settings?.sale_description || ""}
                            onChange={(e) => setSettings(s => s ? { ...s, sale_description: e.target.value } : null)}
                            onBlur={() => updateSettings({ sale_description: settings?.sale_description })}
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
                            <TableHead>Link</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {banners.map((banner) => (
                            <TableRow key={banner.id}>
                              <TableCell>
                                <div 
                                  className="w-32 h-10 rounded flex items-center justify-center text-white text-xs"
                                  style={{ backgroundColor: banner.background_color || '#ff5555' }}
                                >
                                  Preview
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
                                <Badge variant="outline">{banner.link_url || '/sale'}</Badge>
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
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Products Tab */}
              <TabsContent value="products">
                <Card>
                  <CardHeader>
                    <CardTitle>Sale Products</CardTitle>
                    <CardDescription>
                      Manage products that are currently on sale ({saleProducts.length} products)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {products.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No products found. Add products first.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Compare At</TableHead>
                            <TableHead>On Sale</TableHead>
                            <TableHead className="text-right">Toggle</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {products.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={product.image_url || '/placeholder.svg'} 
                                    alt={product.name}
                                    className="w-10 h-10 rounded object-cover"
                                  />
                                  <span className="font-medium">{product.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>PKR {product.price.toLocaleString()}</TableCell>
                              <TableCell>
                                {product.compare_at_price 
                                  ? `PKR ${product.compare_at_price.toLocaleString()}` 
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={product.is_on_sale ? "default" : "secondary"}>
                                  {product.is_on_sale ? "On Sale" : "Regular"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Switch
                                  checked={product.is_on_sale || false}
                                  onCheckedChange={(checked) => toggleProductSale(product.id, checked)}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Banner Dialog */}
      <Dialog open={showBannerDialog} onOpenChange={setShowBannerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedBanner ? "Edit Banner" : "Add New Banner"}</DialogTitle>
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
                placeholder="Up to 50% off!"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="banner-bg">Background Color</Label>
                <Input
                  id="banner-bg"
                  type="color"
                  value={bannerFormData.background_color}
                  onChange={(e) => setBannerFormData({ ...bannerFormData, background_color: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="banner-text">Text Color</Label>
                <Input
                  id="banner-text"
                  type="color"
                  value={bannerFormData.text_color}
                  onChange={(e) => setBannerFormData({ ...bannerFormData, text_color: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="banner-link">Link URL</Label>
              <Input
                id="banner-link"
                value={bannerFormData.link_url}
                onChange={(e) => setBannerFormData({ ...bannerFormData, link_url: e.target.value })}
                placeholder="/sale"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="banner-active">Active</Label>
              <Switch
                id="banner-active"
                checked={bannerFormData.active}
                onCheckedChange={(active) => setBannerFormData({ ...bannerFormData, active })}
              />
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
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