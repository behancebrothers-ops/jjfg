import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tag, X, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface PromoCodeInputProps {
  subtotal: number;
  onDiscountApplied: (discount: {
    id: string;
    amount: number;
    type: string;
    value: number;
    code: string;
  }) => void;
  onDiscountRemoved: () => void;
  appliedDiscount?: {
    id: string;
    amount: number;
    type: string;
    value: number;
    code: string;
  };
}

export const PromoCodeInput = ({
  subtotal,
  onDiscountApplied,
  onDiscountRemoved,
  appliedDiscount,
}: PromoCodeInputProps) => {
  const [promoCode, setPromoCode] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  // Recalculate discount when subtotal changes
  useEffect(() => {
    if (appliedDiscount) {
      let newAmount = 0;
      if (appliedDiscount.type === 'percentage') {
        newAmount = (subtotal * appliedDiscount.value) / 100;
      } else if (appliedDiscount.type === 'fixed') {
        newAmount = Math.min(appliedDiscount.value, subtotal);
      }

      // Only update if amount changed
      if (Math.abs(newAmount - appliedDiscount.amount) > 0.01) {
        onDiscountApplied({
          ...appliedDiscount,
          amount: newAmount,
        });
      }
    }
  }, [subtotal, appliedDiscount, onDiscountApplied]);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      toast.error("Please enter a promo code");
      return;
    }

    setIsApplying(true);

    try {
      const { data, error } = await supabase.rpc("apply_discount_code", {
        p_code: promoCode.toUpperCase(),
        p_order_amount: subtotal,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];

        if (result.error_message) {
          toast.error(result.error_message);
        } else {
          onDiscountApplied({
            id: result.discount_id,
            amount: result.discount_amount,
            type: result.discount_type,
            value: result.discount_value,
            code: promoCode.toUpperCase(),
          });
          toast.success(`Promo code applied! $${result.discount_amount.toFixed(2)} discount added.`);
          setPromoCode("");
        }
      }
    } catch (error) {
      logger.error("Error applying promo code", error);
      toast.error("Failed to apply promo code");
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemoveDiscount = () => {
    onDiscountRemoved();
    toast.success("Promo code removed");
  };

  if (appliedDiscount) {
    return (
      <div className="flex items-center justify-between p-3 bg-green-50/80 backdrop-blur-sm rounded-xl border border-green-200/50 shadow-sm animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-green-800 tracking-wide">{appliedDiscount.code}</span>
            <div className="text-xs text-green-600 font-medium">
              -${appliedDiscount.amount.toFixed(2)} savings
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRemoveDiscount}
          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100 rounded-full"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
        <Input
          placeholder="Enter promo code"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
          className="pl-9 bg-white/50 border-white/60 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all backdrop-blur-sm h-10 rounded-xl"
          disabled={isApplying}
        />
      </div>
      <Button
        onClick={handleApplyPromo}
        disabled={isApplying || !promoCode.trim()}
        variant="outline"
        className="bg-white/50 border-white/60 hover:bg-white hover:border-amber-200 hover:text-amber-700 transition-all rounded-xl shadow-sm"
      >
        {isApplying ? "..." : "Apply"}
      </Button>
    </div>
  );
};
