import { useEffect, useState } from "react";
import { StarRating } from "@/components/StarRating";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { User, Loader2 } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  title: string | null;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

interface ReviewsListProps {
  productId: string;
  refreshTrigger?: number;
}

export const ReviewsList = ({ productId, refreshTrigger = 0 }: ReviewsListProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, [productId, refreshTrigger]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for all reviewers
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        // Map profiles to reviews
        const reviewsWithProfiles = data.map(review => ({
          ...review,
          profiles: profiles?.find(p => p.id === review.user_id) || null
        }));

        setReviews(reviewsWithProfiles);
        
        const avg = data.reduce((acc, review) => acc + review.rating, 0) / data.length;
        setAverageRating(Math.round(avg * 10) / 10);
      } else {
        setReviews([]);
        setAverageRating(0);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.length > 0 && (
        <div className="flex items-center gap-4 pb-4 border-b">
          <div>
            <div className="text-4xl font-bold">{averageRating}</div>
            <StarRating rating={averageRating} size="sm" />
          </div>
          <div className="text-sm text-muted-foreground">
            Based on {reviews.length} review{reviews.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No reviews yet. Be the first to review this product!
        </p>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-b pb-6 last:border-b-0">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <div className="font-semibold">
                      {review.profiles?.full_name || "Anonymous"}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <StarRating rating={review.rating} size="sm" />
                      <span>
                        {formatDistanceToNow(new Date(review.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                  {review.title && (
                    <p className="font-medium">{review.title}</p>
                  )}
                  {review.comment && (
                    <p className="text-muted-foreground leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
