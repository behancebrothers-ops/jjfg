import { useState } from "react";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Search, Trash2, MessageSquare, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StarRating } from "@/components/StarRating";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminReviews() {
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews", searchQuery, ratingFilter],
    queryFn: async () => {
      let query = supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.ilike("review_text", `%${searchQuery}%`);
      }

      if (ratingFilter !== "all") {
        query = query.eq("rating", ratingFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Review[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast({ title: "Success", description: "Review deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete review", variant: "destructive" });
    },
  });

  const stats = {
    total: reviews?.length || 0,
    average: reviews?.length ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : "0",
    fiveStar: reviews?.filter(r => r.rating === 5).length || 0,
    fourStar: reviews?.filter(r => r.rating === 4).length || 0,
    threeStar: reviews?.filter(r => r.rating === 3).length || 0,
    twoStar: reviews?.filter(r => r.rating === 2).length || 0,
    oneStar: reviews?.filter(r => r.rating === 1).length || 0,
  };

  return (
    <ProtectedAdminRoute>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <AdminNavigation />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              Product Reviews
            </h1>
            <p className="text-muted-foreground mt-2">Manage and moderate customer product reviews</p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Average Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">{stats.average}</div>
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">5-Star Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.fiveStar}</div>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">1-Star Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.oneStar}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="all" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <TabsList>
                <TabsTrigger value="all" onClick={() => setRatingFilter("all")}>
                  All Reviews
                </TabsTrigger>
                <TabsTrigger value="5" onClick={() => setRatingFilter(5)}>
                  5 Stars
                </TabsTrigger>
                <TabsTrigger value="4" onClick={() => setRatingFilter(4)}>
                  4 Stars
                </TabsTrigger>
                <TabsTrigger value="3" onClick={() => setRatingFilter(3)}>
                  3 Stars
                </TabsTrigger>
                <TabsTrigger value="2" onClick={() => setRatingFilter(2)}>
                  2 Stars
                </TabsTrigger>
                <TabsTrigger value="1" onClick={() => setRatingFilter(1)}>
                  1 Star
                </TabsTrigger>
              </TabsList>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reviews..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <TabsContent value="all" className="space-y-4">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading reviews...</div>
              ) : reviews?.length === 0 ? (
                <Card className="border-primary/20">
                  <CardContent className="py-12 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No reviews found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery || ratingFilter !== "all"
                        ? "Try adjusting your filters"
                        : "Customer reviews will appear here"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {reviews?.map((review) => (
                    <Card key={review.id} className="border-primary/20 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex gap-4">
                          <div className="flex-1 space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg">
                                  Product ID: {review.product_id}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <StarRating rating={review.rating} size="sm" />
                                  <span className="text-sm text-muted-foreground">
                                    User ID: {review.user_id.slice(0, 8)}...
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {new Date(review.created_at).toLocaleDateString()}
                                  </Badge>
                                </div>
                              </div>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Review</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this review? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(review.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>

                            {/* Review Text */}
                            {review.review_text && (
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {review.review_text}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {[1, 2, 3, 4, 5].map((rating) => (
              <TabsContent key={rating} value={rating.toString()} className="space-y-4">
                {/* Content will be filtered by the main query */}
              </TabsContent>
            ))}
          </Tabs>
        </main>
      </div>
    </ProtectedAdminRoute>
  );
}
