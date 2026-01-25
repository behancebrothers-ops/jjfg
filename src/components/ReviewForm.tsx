import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/StarRating";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShoppingBag } from "lucide-react";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { logger } from "@/lib/logger";

const reviewSchema = z.object({
  rating: z.number().int().min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5"),
  comment: z.string()
    .trim()
    .min(10, "Review must be at least 10 characters")
    .max(2000, "Review must be less than 2000 characters"),
});

interface ReviewFormProps {
  productId: string;
  onReviewSubmitted: () => void;
}

export const ReviewForm = ({ productId, onReviewSubmitted }: ReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPurchased, setHasPurchased] = useState<boolean | null>(null);
  const [isCheckingPurchase, setIsCheckingPurchase] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkPurchaseStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setHasPurchased(false);
          setIsCheckingPurchase(false);
          return;
        }

        const { data, error } = await supabase.rpc('has_purchased_product', {
          _user_id: user.id,
          _product_id: productId
        });

        if (error) throw error;
        setHasPurchased(data);
      } catch (error) {
        logger.error("Error checking purchase status", error);
        setHasPurchased(false);
      } finally {
        setIsCheckingPurchase(false);
      }
    };

    checkPurchaseStatus();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input using Zod schema
    const validation = reviewSchema.safeParse({
      rating,
      comment: reviewText,
    });

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      toast({
        title: "Validation Error",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to submit a review",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("reviews")
        .insert({
          product_id: productId,
          user_id: user.id,
          rating: validation.data.rating,
          comment: validation.data.comment,
        });

      if (error) {
        if (error.message.includes("violates row-level security")) {
          toast({
            title: "Purchase Required",
            description: "You can only review products you've purchased and received.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });

      setRating(0);
      setReviewText("");
      onReviewSubmitted();
    } catch (error) {
      logger.error("Error submitting review", error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingPurchase) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasPurchased) {
    return (
      <Alert className="border-primary/20">
        <ShoppingBag className="h-4 w-4" />
        <AlertDescription>
          You can only review products you've purchased and received. Complete an order with this product to leave a review.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-2">Your Rating</label>
        <StarRating
          rating={rating}
          size="lg"
          interactive
          onRatingChange={setRating}
        />
      </div>

      <div>
        <label htmlFor="review" className="block text-sm font-semibold mb-2">
          Your Review
        </label>
        <Textarea
          id="review"
          placeholder="Share your thoughts about this product..."
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={4}
          className="resize-none"
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Review"
        )}
      </Button>
    </form>
  );
};
