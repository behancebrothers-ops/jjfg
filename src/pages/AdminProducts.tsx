import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProductDialog } from "@/components/admin/ProductDialog";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  sale_price?: number | null;
  category: string;
  stock: number;
  image_url?: string;
  is_featured: boolean;
  is_new_arrival: boolean;
  created_at?: string;
};

const AdminProducts = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<string>("all");
  const [stockLevel, setStockLevel] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedProduct(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (productId: string) => {
    setProductToDelete(productId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete);

      if (error) throw error;

      toast({
        title: "Product Deleted",
        description: "Product has been successfully deleted.",
      });
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  // Get unique categories from products
  const categories = Array.from(new Set(products.map(p => p.category)));

  // Apply all filters
  const filteredProducts = products
    .filter(product => {
      // Search filter
      const matchesSearch = 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Category filter
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      
      // Price range filter
      const matchesPrice = 
        priceRange === "all" ||
        (priceRange === "0-50" && product.price < 50) ||
        (priceRange === "50-100" && product.price >= 50 && product.price < 100) ||
        (priceRange === "100-200" && product.price >= 100 && product.price < 200) ||
        (priceRange === "200-500" && product.price >= 200 && product.price < 500) ||
        (priceRange === "500+" && product.price >= 500);
      
      // Stock level filter
      const matchesStock = 
        stockLevel === "all" ||
        (stockLevel === "in-stock" && product.stock > 0) ||
        (stockLevel === "low-stock" && product.stock > 0 && product.stock <= 50) ||
        (stockLevel === "out-of-stock" && product.stock === 0);
      
      return matchesSearch && matchesCategory && matchesPrice && matchesStock;
    })
    .sort((a, b) => {
      // Sort products
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case "oldest":
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "name-az":
          return a.name.localeCompare(b.name);
        case "name-za":
          return b.name.localeCompare(a.name);
        case "stock-low":
          return a.stock - b.stock;
        case "stock-high":
          return b.stock - a.stock;
        default:
          return 0;
      }
    });

  return (
    <ProtectedAdminRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <AdminNavigation />

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Products Management</h1>
            <p className="text-slate-500">
              {loading ? "Loading..." : `${filteredProducts.length} products in inventory`}
            </p>
          </div>
          <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="p-6 mb-6 space-y-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search products by name, category, or description..." 
              className="pl-10 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white placeholder:text-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 z-10"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Price Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Price Range</label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 z-10"
              >
                <option value="all">All Prices</option>
                <option value="0-50">Under PKR 500</option>
                <option value="50-100">PKR 500 - 1000</option>
                <option value="100-200">PKR 1000 - 2000</option>
                <option value="200-500">PKR 2000 - 5000</option>
                <option value="500+">PKR 5000+</option>
              </select>
            </div>

            {/* Stock Level Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Stock Level</label>
              <select
                value={stockLevel}
                onChange={(e) => setStockLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 z-10"
              >
                <option value="all">All Stock Levels</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock (≤50)</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 z-10"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name-az">Name: A to Z</option>
                <option value="name-za">Name: Z to A</option>
                <option value="stock-low">Stock: Low to High</option>
                <option value="stock-high">Stock: High to Low</option>
              </select>
            </div>
          </div>

          {/* Active Filters Summary */}
          {(searchQuery || selectedCategory !== "all" || priceRange !== "all" || stockLevel !== "all") && (
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {searchQuery && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="h-7 text-xs"
                >
                  Search: "{searchQuery}" ×
                </Button>
              )}
              {selectedCategory !== "all" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedCategory("all")}
                  className="h-7 text-xs"
                >
                  Category: {selectedCategory} ×
                </Button>
              )}
              {priceRange !== "all" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPriceRange("all")}
                  className="h-7 text-xs"
                >
                  Price: {priceRange} ×
                </Button>
              )}
              {stockLevel !== "all" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setStockLevel("all")}
                  className="h-7 text-xs"
                >
                  Stock: {stockLevel.replace("-", " ")} ×
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setPriceRange("all");
                  setStockLevel("all");
                }}
                className="h-7 text-xs text-destructive hover:text-destructive"
              >
                Clear All
              </Button>
            </div>
          )}
        </Card>

        {/* Products Table */}
        {loading ? (
          <TableSkeleton rows={10} />
        ) : (
          <Card className="overflow-hidden bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="text-left py-4 px-4 font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Product</th>
                    <th className="text-left py-4 px-4 font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Category</th>
                    <th className="text-left py-4 px-4 font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Price</th>
                    <th className="text-left py-4 px-4 font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Stock</th>
                    <th className="text-right py-4 px-4 font-semibold text-slate-500 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No products found
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.id} className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.image_url || "/placeholder.svg"}
                              alt={product.name}
                              className="w-12 h-12 rounded object-cover border border-slate-200 dark:border-slate-600"
                              loading="lazy"
                            />
                            <div>
                              <p className="font-medium text-slate-800 dark:text-white">{product.name}</p>
                              <p className="text-sm text-slate-400">
                                {product.id.substring(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 rounded text-sm">
                            {product.category}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            {product.sale_price ? (
                              <>
                                <span className="text-sm text-muted-foreground line-through">
                                  PKR {product.price.toLocaleString()}
                                </span>
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                  PKR {product.sale_price.toLocaleString()}
                                </span>
                              </>
                            ) : (
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                PKR {product.price.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`font-medium ${
                            product.stock > 100 ? "text-emerald-600 dark:text-emerald-400" :
                            product.stock > 50 ? "text-amber-600 dark:text-amber-400" :
                            "text-rose-600 dark:text-rose-400"
                          }`}>
                            {product.stock} units
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10" onClick={() => handleEdit(product)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                              onClick={() => handleDeleteClick(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

        <ProductDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          product={selectedProduct}
          onSuccess={fetchProducts}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this product? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedAdminRoute>
  );
};

export default AdminProducts;
