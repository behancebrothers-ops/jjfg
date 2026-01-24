import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { Search, X, Package } from "lucide-react";

const discountCodeSchema = z.object({
  code: z.string().trim().min(2, "Code must be at least 2 characters").max(50, "Code too long"),
  description: z.string().trim().max(255, "Description too long").optional(),
  discount_type: z.union([z.literal("percentage"), z.literal("fixed")]),
  discount_value: z.number().min(0.01, "Value must be greater than 0"),
  minimum_purchase: z.number().min(0, "Cannot be negative").optional(),
  usage_limit: z.number().int().min(1, "Must be at least 1").optional(),
  valid_from: z.string().min(1, "Start date required"),
  valid_until: z.string().optional(),
  active: z.boolean(),
  applies_to: z.union([z.literal("all"), z.literal("specific")]),
});

type DiscountCode = z.infer<typeof discountCodeSchema> & { id?: string };

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string;
}

interface DiscountCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discountCode?: DiscountCode & { applies_to?: string };
  onSuccess: () => void;
}

export function DiscountCodeDialog({
  open,
  onOpenChange,
  discountCode,
  onSuccess,
}: DiscountCodeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [formData, setFormData] = useState<DiscountCode>({
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: 10,
    minimum_purchase: undefined,
    usage_limit: undefined,
    valid_from: new Date().toISOString().split("T")[0],
    valid_until: "",
    active: true,
    applies_to: "all",
  });

  useEffect(() => {
    if (open) {
      fetchProducts();
    }
  }, [open]);

  useEffect(() => {
    if (discountCode) {
      setFormData({
        ...discountCode,
        valid_from: discountCode.valid_from?.split("T")[0] || "",
        valid_until: discountCode.valid_until?.split("T")[0] || "",
        applies_to: (discountCode.applies_to as "all" | "specific") || "all",
      });
      // Fetch linked products if editing
      if (discountCode.id && discountCode.applies_to === "specific") {
        fetchLinkedProducts(discountCode.id);
      } else {
        setSelectedProducts([]);
      }
    } else {
      setFormData({
        code: "",
        description: "",
        discount_type: "percentage",
        discount_value: 10,
        minimum_purchase: undefined,
        usage_limit: undefined,
        valid_from: new Date().toISOString().split("T")[0],
        valid_until: "",
        active: true,
        applies_to: "all",
      });
      setSelectedProducts([]);
    }
    setErrors({});
    setProductSearch("");
  }, [discountCode, open]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url, category")
        .order("name");
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      logger.error("Error fetching products", error);
    }
  };

  const fetchLinkedProducts = async (discountCodeId: string) => {
    try {
      const { data, error } = await supabase
        .from("discount_code_products")
        .select("product_id")
        .eq("discount_code_id", discountCodeId);
      
      if (error) throw error;
      setSelectedProducts(data?.map(p => p.product_id) || []);
    } catch (error) {
      logger.error("Error fetching linked products", error);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = discountCodeSchema.parse(formData);
      
      // Validate product selection for specific applies_to
      if (validated.applies_to === "specific" && selectedProducts.length === 0) {
        setErrors({ applies_to: "Please select at least one product" });
        return;
      }

      setLoading(true);

      const dataToSave = {
        code: validated.code.toUpperCase(),
        description: validated.description || null,
        discount_type: validated.discount_type,
        discount_value: validated.discount_value,
        minimum_purchase: validated.minimum_purchase || 0,
        usage_limit: validated.usage_limit || null,
        valid_from: new Date(validated.valid_from).toISOString(),
        valid_until: validated.valid_until ? new Date(validated.valid_until).toISOString() : null,
        active: validated.active,
        applies_to: validated.applies_to,
      };

      let discountId = discountCode?.id;

      if (discountCode?.id) {
        const { error } = await supabase
          .from("discount_codes")
          .update(dataToSave)
          .eq("id", discountCode.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("discount_codes")
          .insert(dataToSave)
          .select("id")
          .single();

        if (error) throw error;
        discountId = data.id;
      }

      // Handle product associations if applies_to is specific
      if (validated.applies_to === "specific" && discountId) {
        // Delete existing associations
        await supabase
          .from("discount_code_products")
          .delete()
          .eq("discount_code_id", discountId);

        // Insert new associations
        if (selectedProducts.length > 0) {
          const associations = selectedProducts.map(productId => ({
            discount_code_id: discountId,
            product_id: productId,
          }));

          const { error: insertError } = await supabase
            .from("discount_code_products")
            .insert(associations);

          if (insertError) throw insertError;
        }
      } else if (validated.applies_to === "all" && discountId) {
        // Remove all product associations if switching to "all"
        await supabase
          .from("discount_code_products")
          .delete()
          .eq("discount_code_id", discountId);
      }

      toast.success(discountCode ? "Discount code updated successfully" : "Discount code created successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        logger.error("Error saving discount code", error);
        toast.error("Failed to save discount code");
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {discountCode ? "Edit Discount Code" : "Create Discount Code"}
          </DialogTitle>
          <DialogDescription>
            {discountCode
              ? "Update the discount code details below"
              : "Create a new discount code for your customers"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">
                Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="SAVE10"
                maxLength={50}
                disabled={loading}
              />
              {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_type">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.discount_type}
                onValueChange={(value: "percentage" | "fixed") =>
                  setFormData({ ...formData, discount_type: value })
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                </SelectContent>
              </Select>
              {errors.discount_type && (
                <p className="text-sm text-destructive">{errors.discount_type}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount_value">
                {formData.discount_type === "percentage" ? "Percentage" : "Amount"}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="discount_value"
                type="number"
                step="0.01"
                min="0.01"
                max={formData.discount_type === "percentage" ? "100" : undefined}
                value={formData.discount_value}
                onChange={(e) =>
                  setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })
                }
                disabled={loading}
              />
              {errors.discount_value && (
                <p className="text-sm text-destructive">{errors.discount_value}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimum_purchase">Minimum Purchase ($)</Label>
              <Input
                id="minimum_purchase"
                type="number"
                step="0.01"
                min="0"
                value={formData.minimum_purchase || ""}
                onChange={(e) =>
                  setFormData({ ...formData, minimum_purchase: e.target.value ? parseFloat(e.target.value) : undefined })
                }
                disabled={loading}
              />
              {errors.minimum_purchase && (
                <p className="text-sm text-destructive">{errors.minimum_purchase}</p>
              )}
            </div>
          </div>

          {/* Applies To Selection */}
          <div className="space-y-2">
            <Label htmlFor="applies_to">
              Applies To <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.applies_to}
              onValueChange={(value: "all" | "specific") =>
                setFormData({ ...formData, applies_to: value })
              }
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="specific">Specific Products</SelectItem>
              </SelectContent>
            </Select>
            {errors.applies_to && (
              <p className="text-sm text-destructive">{errors.applies_to}</p>
            )}
          </div>

          {/* Product Selection */}
          {formData.applies_to === "specific" && (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
              <Label>Select Products</Label>
              
              {/* Selected Products */}
              {selectedProductsData.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedProductsData.map(product => (
                    <Badge
                      key={product.id}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      {product.name}
                      <button
                        type="button"
                        onClick={() => toggleProduct(product.id)}
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>

              {/* Product List */}
              <ScrollArea className="h-48 border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No products found
                    </p>
                  ) : (
                    filteredProducts.map(product => (
                      <label
                        key={product.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={() => toggleProduct(product.id)}
                        />
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.category} • ${product.price.toFixed(2)}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </ScrollArea>
              
              <p className="text-xs text-muted-foreground">
                {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="usage_limit">Usage Limit (Optional)</Label>
            <Input
              id="usage_limit"
              type="number"
              min="1"
              value={formData.usage_limit || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  usage_limit: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              placeholder="Unlimited"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for unlimited uses
            </p>
            {errors.usage_limit && (
              <p className="text-sm text-destructive">{errors.usage_limit}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valid_from">
                Valid From <span className="text-destructive">*</span>
              </Label>
              <Input
                id="valid_from"
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                disabled={loading}
              />
              {errors.valid_from && (
                <p className="text-sm text-destructive">{errors.valid_from}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="valid_until">Valid Until (Optional)</Label>
              <Input
                id="valid_until"
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                min={formData.valid_from}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for no expiration
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Holiday sale discount"
              maxLength={255}
              rows={3}
              disabled={loading}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              disabled={loading}
            />
            <Label htmlFor="active" className="cursor-pointer">
              Active
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : discountCode ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}