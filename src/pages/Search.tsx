import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { DbProductCard } from "@/components/DbProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search as SearchIcon, Sparkles, TrendingUp, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface SearchMatch {
  productId: string;
  matchScore: number;
  matchReason: string;
}

interface Recommendation {
  productId: string;
  reason: string;
  relevanceScore: number;
}

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [alternativeSearches, setAlternativeSearches] = useState<string[]>([]);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Debounced suggestions as user types
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const { data, error } = await supabase.functions.invoke('ai-search', {
          body: { query: searchQuery, action: 'suggestions' }
        });

        if (error) throw error;
        if (data?.data && Array.isArray(data.data)) {
          setSuggestions(data.data);
        }
      } catch (error) {
        logger.error("Error fetching suggestions", error);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Initial search from URL params
  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, []);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    setIsSearching(true);
    setResults([]);
    setRecommendations([]);
    setAlternativeSearches([]);
    setDidYouMean(null);

    try {
      // Get AI-enhanced search results
      const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-search', {
        body: { query, action: 'search' }
      });

      if (aiError) {
        if (aiError.message?.includes('429') || aiError.message?.includes('Rate limit')) {
          toast.error("Search is temporarily limited. Please try again in a moment.");
        } else if (aiError.message?.includes('402')) {
          toast.error("AI search unavailable. Using basic search.");
        }
        // Fallback to basic search
        await performBasicSearch(query);
        return;
      }

      if (aiData?.data?.matches) {
        const matches = aiData.data.matches as SearchMatch[];
        setDidYouMean(aiData.data.didYouMean);

        // Fetch actual products based on AI matches
        const productIds = matches
          .filter(m => m.matchScore > 30) // Only show reasonably good matches
          .sort((a, b) => b.matchScore - a.matchScore)
          .map(m => m.productId);

        if (productIds.length > 0) {
          const { data: products, error: productsError } = await supabase
            .from("products")
            .select("*")
            .in("id", productIds);

          if (!productsError && products) {
            // Sort products by AI match score
            const sortedProducts = products.sort((a, b) => {
              const scoreA = matches.find(m => m.productId === a.id)?.matchScore || 0;
              const scoreB = matches.find(m => m.productId === b.id)?.matchScore || 0;
              return scoreB - scoreA;
            });
            setResults(sortedProducts);
          }
        } else {
          // No good matches, try basic search
          await performBasicSearch(query);
        }
      }

      // Get recommendations
      const { data: recData } = await supabase.functions.invoke('ai-search', {
        body: { query, action: 'recommendations' }
      });

      if (recData?.data?.recommendations) {
        const recs = recData.data.recommendations as Recommendation[];
        const recIds = recs
          .filter(r => r.relevanceScore > 50)
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, 3)
          .map(r => r.productId);

        if (recIds.length > 0) {
          const { data: recProducts } = await supabase
            .from("products")
            .select("*")
            .in("id", recIds);

          if (recProducts) {
            setRecommendations(recProducts);
          }
        }

        setAlternativeSearches(recData.data.alternativeSearches || []);
      }
    } catch (error: any) {
      console.error("Search error:", error);
      toast.error("Search failed. Using basic search.");
      await performBasicSearch(query);
    } finally {
      setIsSearching(false);
    }
  };

  const performBasicSearch = async (query: string) => {
    try {
      const { data: products, error } = await supabase
        .from("products")
        .select("*")
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`);

      if (!error && products) {
        setResults(products);
      }
    } catch (error) {
      logger.error("Basic search error", error);
      toast.error("Search failed. Please try again.");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery });
      performSearch(searchQuery);
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setSearchParams({ q: suggestion });
    performSearch(suggestion);
    setSuggestions([]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            AI-Powered Search
          </h1>
          
          <form onSubmit={handleSearch} className="mb-8 relative">
            <div className="flex gap-2">
              <div className="flex-grow relative">
                <Input
                  type="search"
                  placeholder="Search products with AI..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
                {isLoadingSuggestions && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  </div>
                )}
                
                {/* Suggestions dropdown */}
                {suggestions.length > 0 && (
                  <Card className="absolute top-full mt-2 w-full z-50 shadow-lg">
                    <CardContent className="p-2">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full text-left px-3 py-2 hover:bg-accent rounded-md transition-colors text-sm"
                        >
                          <SearchIcon className="h-3 w-3 inline mr-2 text-muted-foreground" />
                          {suggestion}
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
              <Button type="submit" disabled={isSearching}>
                <SearchIcon className="h-4 w-4 mr-2" />
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>
          </form>

          {/* Did you mean */}
          {didYouMean && (
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">
                Did you mean:{" "}
                <button
                  onClick={() => handleSuggestionClick(didYouMean)}
                  className="text-primary hover:underline font-medium"
                >
                  {didYouMean}
                </button>
              </p>
            </div>
          )}

          {/* Alternative searches */}
          {alternativeSearches.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Try these searches:</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {alternativeSearches.map((search, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => handleSuggestionClick(search)}
                  >
                    {search}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Results count */}
          {searchQuery && !isSearching && (
            <div className="mb-6">
              <p className="text-muted-foreground">
                {results.length} {results.length === 1 ? 'result' : 'results'} for "{searchQuery}"
              </p>
            </div>
          )}

          {/* Search Results */}
          {results.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xl font-semibold mb-4">Search Results</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {results.map((product) => (
                  <DbProductCard 
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    price={product.price}
                    imageUrl={product.image_url}
                    category={product.category}
                    stock={product.stock}
                  />
                ))}
              </div>
            </div>
          )}

          {/* AI Recommendations */}
          {recommendations.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Recommended for You</h2>
              </div>
              <Card>
                <CardHeader>
                  <CardDescription>
                    Based on your search, we think you might like these products
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {recommendations.map((product) => (
                      <DbProductCard 
                        key={product.id}
                        id={product.id}
                        name={product.name}
                        price={product.price}
                        imageUrl={product.image_url}
                        category={product.category}
                        stock={product.stock}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* No results */}
          {searchQuery && !isSearching && results.length === 0 && (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground mb-4">
                No products found matching your search.
              </p>
              {alternativeSearches.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Try different keywords or browse our categories.
                </p>
              )}
            </div>
          )}

          {/* Loading state */}
          {isSearching && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Searching with AI...</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Search;
