import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Upload, GripVertical, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Product = {
  id?: string;
  name: string;
  description: string;
  price: number;
  compare_at_price?: number | null;
  category: string;
  stock: number;
  image_url?: string;
  is_featured?: boolean;
  is_new?: boolean;
};

type ProductImage = {
  id?: string;
  image_url: string;
  alt_text?: string;
  position: number;
};

type ProductDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSuccess: () => void;
};

export function ProductDialog({ open, onOpenChange, product, onSuccess }: ProductDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Product>({
    name: "",
    description: "",
    price: 0,
    compare_at_price: null,
    category: "",
    stock: 0,
    image_url: "",
    is_featured: false,
    is_new: false,
  });
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("id, name, slug")
          .order("name", { ascending: true });

        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    if (product?.id) {
      setFormData({
        ...product,
        compare_at_price: product.compare_at_price || null,
        is_featured: product.is_featured || false,
        is_new: product.is_new || false,
      });
      // Images would need to be stored in a separate table
      setProductImages([]);
    } else {
      setFormData({
        name: "",
        description: "",
        price: 0,
        compare_at_price: null,
        category: "",
        stock: 0,
        image_url: "",
        is_featured: false,
        is_new: false,
      });
      setProductImages([]);
    }
  }, [product]);

  useEffect(() => {
    if (!open) {
      setFormData({
        name: "",
        description: "",
        price: 0,
        compare_at_price: null,
        category: "",
        stock: 0,
        image_url: "",
        is_featured: false,
        is_new: false,
      });
      setProductImages([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [open]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedImages: ProductImage[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Invalid file",
            description: `${file.name} is not an image`,
            variant: "destructive",
          });
          continue;
        }

        if (file.size > 10485760) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds 10MB limit`,
            variant: "destructive",
          });
          continue;
        }

        // For now, use a placeholder URL since storage bucket may not exist
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        uploadedImages.push({
          image_url: URL.createObjectURL(file),
          alt_text: file.name.replace(/\.[^/.]+$/, ""),
          position: productImages.length + uploadedImages.length,
        });
      }

      if (uploadedImages.length > 0) {
        setProductImages([...productImages, ...uploadedImages]);
        toast({
          title: "Success",
          description: `${uploadedImages.length} image(s) added`,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to process images",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = async (index: number) => {
    setProductImages(productImages.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...productImages];
    const draggedItem = newImages[draggedIndex];
    
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);
    newImages.forEach((img, i) => img.position = i);
    
    setProductImages(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!formData.name || !formData.description || !formData.category || formData.price <= 0 || formData.stock < 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Use first image as main product image if available
      const mainImageUrl = productImages[0]?.image_url || formData.image_url || '';
      
      const productData = {
        name: formData.name,
        slug: formData.name.toLowerCase().replace(/\s+/g, '-'),
        description: formData.description,
        price: formData.price,
        compare_at_price: formData.compare_at_price,
        category: formData.category,
        stock: formData.stock,
        image_url: mainImageUrl,
        is_featured: formData.is_featured,
        is_new: formData.is_new,
      };

      if (product?.id) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);
        
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Product ${product?.id ? 'updated' : 'created'} successfully`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save product",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {product ? "Edit Product" : "Add New Product"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter product name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter product description"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background z-50 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.price || ''}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                placeholder="e.g., 2500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="compare_at_price">Compare at Price (Optional)</Label>
              <Input
                id="compare_at_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.compare_at_price || ''}
                onChange={(e) => setFormData({ ...formData, compare_at_price: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="Original price before discount"
              />
              <p className="text-xs text-muted-foreground">
                Shows as strikethrough price if set
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Stock *</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock || ''}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked as boolean })}
              />
              <Label htmlFor="is_featured">Featured Product</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_new"
                checked={formData.is_new}
                onCheckedChange={(checked) => setFormData({ ...formData, is_new: checked as boolean })}
              />
              <Label htmlFor="is_new">New Arrival</Label>
            </div>
          </div>

          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Product Images
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading..." : "Upload Images"}
              </Button>
            </div>

            {productImages.length > 0 ? (
              <div className="grid gap-3">
                {productImages.map((image, index) => (
                  <div
                    key={image.id || index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`group flex items-center gap-3 p-3 bg-gradient-to-r from-card to-muted/50 rounded-xl border-2 transition-all duration-300 cursor-move hover:shadow-md ${
                      draggedIndex === index 
                        ? 'border-primary shadow-lg scale-105 opacity-50' 
                        : 'border-border/50 hover:border-primary/50'
                    }`}
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={image.image_url}
                        alt={image.alt_text || 'Product image'}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        Image {index + 1}
                      </p>
                      {image.alt_text && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {image.alt_text}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Position: {index + 1}
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={() => removeImage(index)}
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center">
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click "Upload Images" to add product photos
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : product?.id ? "Update Product" : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
