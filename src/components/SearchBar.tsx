import { useState, useEffect, useRef } from "react";
import { Search, X, TrendingUp, Clock, Sparkles, ArrowRight } from "lucide-react";
import { Input } from "./ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchSuggestion {
  id: string;
  name: string;
  category: string | null;
  price: number;
  compare_at_price: number | null;
  image_url: string | null;
}

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

const trendingSearches = [
  "Summer dresses",
  "Leather bags",
  "Silk scarves",
  "Designer shoes",
];

const popularCategories = [
  { name: "Women", icon: "👗" },
  { name: "Men", icon: "👔" },
  { name: "Accessories", icon: "✨" },
  { name: "Shoes", icon: "👟" },
];

export const SearchBar = ({ isOpen, onClose, isMobile = false }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 300);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  // Auto-focus on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Fetch suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, category, price, compare_at_price, image_url")
          .or(`name.ilike.%${debouncedQuery}%,category.ilike.%${debouncedQuery}%,description.ilike.%${debouncedQuery}%`)
          .limit(6);

        if (!error && data) {
          setSuggestions(data);
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  const saveRecentSearch = (searchTerm: string) => {
    const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  };

  const handleSearch = (searchTerm: string) => {
    if (searchTerm.trim()) {
      saveRecentSearch(searchTerm.trim());
      navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
      setQuery("");
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleProductClick = (productId: string, productName: string) => {
    saveRecentSearch(productName);
    navigate(`/product/${productId}`);
    setQuery("");
    onClose();
  };

  const handleCategoryClick = (category: string) => {
    navigate(`/products?category=${category.toLowerCase()}`);
    setQuery("");
    onClose();
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("recentSearches");
  };

  const showSuggestions = isFocused || query.length > 0;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div className={`${isMobile ? 'px-2' : ''} pb-4`}>
        {/* Search Input */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative group">
            {/* Glow Effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 via-pink-500 to-purple-500 rounded-2xl opacity-0 group-focus-within:opacity-75 blur transition-all duration-300" />
            
            <div className="relative flex items-center bg-background border border-border/50 rounded-2xl shadow-lg overflow-hidden">
              <div className="pl-4 pr-2">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search for products, brands, and more..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 py-4 text-base placeholder:text-muted-foreground/60"
              />
              
              <AnimatePresence>
                {query && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    type="button"
                    onClick={() => setQuery("")}
                    className="p-2 mr-1 hover:bg-muted rounded-full transition-colors"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </motion.button>
                )}
              </AnimatePresence>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="h-full px-6 py-3 bg-gradient-to-r from-amber-500 to-pink-500 text-white font-medium hover:from-amber-600 hover:to-pink-600 transition-all flex items-center gap-2"
              >
                <span className="hidden sm:inline">Search</span>
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
        </form>

        {/* Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mt-3 bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Loading State */}
              {isLoading && (
                <div className="p-4 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="h-5 w-5 text-amber-500" />
                  </motion.div>
                  <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
                </div>
              )}

              {/* Product Suggestions */}
              {!isLoading && suggestions.length > 0 && (
                <div className="p-2">
                  <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Products
                  </p>
                  <div className="space-y-1">
                    {suggestions.map((product, index) => (
                      <motion.button
                        key={product.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleProductClick(product.id, product.name)}
                        className="w-full flex items-center gap-3 p-2 hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-pink-500/10 rounded-xl transition-all group"
                      >
                        <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Sparkles className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-sm line-clamp-1 group-hover:text-amber-600 transition-colors">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{product.category}</span>
                            <span className="text-xs">•</span>
                            {product.compare_at_price ? (
                              <>
                                <span className="text-xs font-semibold text-green-600">${product.price.toFixed(2)}</span>
                                <span className="text-xs text-muted-foreground line-through">${product.compare_at_price.toFixed(2)}</span>
                              </>
                            ) : (
                              <span className="text-xs font-semibold">${product.price.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </motion.button>
                    ))}
                  </div>
                  
                  {/* View All Results */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleSearch(query)}
                    className="w-full mt-2 p-3 text-center text-sm font-medium text-amber-600 hover:text-amber-700 bg-amber-50 dark:bg-amber-500/10 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                  >
                    View all results for "{query}"
                  </motion.button>
                </div>
              )}

              {/* No Query - Show Recent & Trending */}
              {!isLoading && !query && (
                <div className="p-4 space-y-6">
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          Recent Searches
                        </p>
                        <button
                          onClick={clearRecentSearches}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((search, index) => (
                          <motion.button
                            key={search}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handleSearch(search)}
                            className="px-3 py-1.5 text-sm bg-muted hover:bg-gradient-to-r hover:from-amber-500/20 hover:to-pink-500/20 rounded-full transition-all"
                          >
                            {search}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trending Searches */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                      <TrendingUp className="h-3 w-3" />
                      Trending Now
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {trendingSearches.map((search, index) => (
                        <motion.button
                          key={search}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleSearch(search)}
                          className="px-3 py-1.5 text-sm border border-border/50 hover:border-amber-500/50 hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-pink-500/10 rounded-full transition-all flex items-center gap-1.5"
                        >
                          <TrendingUp className="h-3 w-3 text-amber-500" />
                          {search}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Popular Categories */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                      <Sparkles className="h-3 w-3" />
                      Popular Categories
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {popularCategories.map((category, index) => (
                        <motion.button
                          key={category.name}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleCategoryClick(category.name)}
                          className="p-3 bg-gradient-to-br from-muted to-muted/50 hover:from-amber-500/10 hover:to-pink-500/10 rounded-xl transition-all text-center group"
                        >
                          <span className="text-2xl mb-1 block group-hover:scale-110 transition-transform">{category.icon}</span>
                          <span className="text-xs font-medium">{category.name}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* No Results */}
              {!isLoading && query.length >= 2 && suggestions.length === 0 && (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium mb-1">No products found</p>
                  <p className="text-sm text-muted-foreground">
                    Try searching for something else or browse our categories
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {popularCategories.map((category) => (
                      <button
                        key={category.name}
                        onClick={() => handleCategoryClick(category.name)}
                        className="px-3 py-1.5 text-sm bg-muted hover:bg-amber-500/20 rounded-full transition-colors"
                      >
                        {category.icon} {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
