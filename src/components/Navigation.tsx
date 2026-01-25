import { ShoppingCart, User, Menu, Search, X, Heart, LogOut, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useState, useEffect, useCallback, memo, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { SearchBar } from "./SearchBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export const Navigation = () => {
  const { toast } = useToast();
  const { cartCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const [scrolled, setScrolled] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const navigate = useNavigate();

  // Use Supabase Auth
  const { user, isAuthenticated, isLoading, signOut } = useAuth();

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const initializeWishlist = async () => {
      if (isAuthenticated && user) {
        await fetchWishlistCount(user.id);

        // Set up realtime subscription for wishlist changes
        channel = supabase
          .channel('nav-wishlist-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'favorites',
              filter: `user_id=eq.${user.id}`
            },
            async () => {
              await fetchWishlistCount(user.id);
            }
          )
          .subscribe();
      } else {
        setWishlistCount(0);
      }
    };

    if (!isLoading) {
      initializeWishlist();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [isAuthenticated, user?.id, isLoading]);

  const fetchWishlistCount = async (userId: string) => {
    try {
      const { count } = await supabase
        .from("favorites")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      setWishlistCount(count || 0);
    } catch (error) {
      console.error("Error fetching wishlist count:", error);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrolled]);

  const handleLogout = useCallback(async () => {
    await signOut();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    navigate("/");
  }, [signOut, toast, navigate]);

  const handleCloseSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  const navLinks = useMemo(() => [
    { to: "/products", label: "Fragrances" },
    { to: "/sale", label: "Sale", highlight: true },
    { to: "/products?category=home-scents", label: "Home Scents", icon: "✨" },
    { to: "/new-arrivals", label: "New Arrivals" },
  ], []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-md supports-[backdrop-filter]:bg-background/60"
          : "bg-transparent backdrop-blur-none border-b border-transparent"
        }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between">
          {/* Logo with Glow Effect */}
          <Link to="/" className="relative group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2"
            >
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute -inset-2 bg-gradient-to-r from-amber-500 via-pink-500 to-purple-500 rounded-full opacity-0 group-hover:opacity-20 blur-xl transition-opacity"
              />
              <Sparkles className="h-6 w-6 text-primary relative z-10" />
              <span className="text-2xl font-bold tracking-tighter relative z-10 font-serif">
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  SCENT LUXE
                </span>
              </span>
            </motion.div>
          </Link>

          {/* Desktop Navigation with Animated Underlines */}
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link, index) => (
              <motion.div
                key={link.to}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={link.to}
                  className={`relative text-sm font-semibold transition-colors group py-2 px-3 rounded-full ${link.highlight
                      ? "text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg"
                      : "text-foreground/80 hover:text-foreground"
                    }`}
                >
                  {link.highlight && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                    </span>
                  )}
                  {link.label}
                  {!link.highlight && (
                    <>
                      <motion.span
                        className="absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-amber-500 to-pink-500"
                        initial={{ width: 0 }}
                        whileHover={{ width: "100%" }}
                        transition={{ duration: 0.3 }}
                      />
                      <span className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-pink-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                    </>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Right Side Actions with Animations */}
          <div className="flex items-center gap-2">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex rounded-full relative overflow-hidden group"
                onClick={() => setSearchOpen(!searchOpen)}
                aria-label={searchOpen ? "Close search" : "Open search"}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                {searchOpen ? <X className="h-5 w-5 relative z-10" /> : <Search className="h-5 w-5 relative z-10" />}
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Link to="/wishlist" aria-label="Wishlist">
                <Button variant="ghost" size="icon" className="relative rounded-full overflow-visible group">
                  <span className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                  <Heart className="h-5 w-5 relative z-10" />
                  <AnimatePresence>
                    {wishlistCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-red-500 text-[10px] font-bold text-white shadow-lg z-50"
                      >
                        {wishlistCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Link to="/cart">
                <Button variant="ghost" size="icon" className="relative rounded-full overflow-visible group">
                  <span className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                  <ShoppingCart className="h-5 w-5 relative z-10" />
                  <AnimatePresence>
                    {cartCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-pink-500 text-[10px] font-bold text-white shadow-lg z-50"
                      >
                        {cartCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </Link>
            </motion.div>

            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button variant="ghost" size="icon" className="rounded-full relative overflow-hidden group">
                      <span className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <User className="h-5 w-5 relative z-10" />
                    </Button>
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background/95 backdrop-blur-xl border-border/50 z-50">
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                      {user.email}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-pink-500/10">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/orders")} className="cursor-pointer hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-pink-500/10">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/wishlist")} className="cursor-pointer hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-pink-500/10">
                      <Heart className="mr-2 h-4 w-4" />
                      Wishlist
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/account-settings")} className="cursor-pointer hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-pink-500/10">
                      <User className="mr-2 h-4 w-4" />
                      Account Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer hover:bg-destructive/10 text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </motion.div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden md:flex border border-border/50 hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-pink-500/10 transition-all relative overflow-hidden group"
                    onClick={() => navigate("/auth")}
                  >
                    <span className="relative z-10">Login</span>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-amber-500 to-pink-500 text-white border-0 shadow-lg hover:shadow-xl transition-all relative overflow-hidden group"
                    onClick={() => navigate("/auth?tab=signup")}
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10">Sign Up</span>
                  </Button>
                </motion.div>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden rounded-full"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Enhanced Search Bar */}
        <AnimatePresence>
          {searchOpen && (
            <SearchBar isOpen={searchOpen} onClose={handleCloseSearch} />
          )}
        </AnimatePresence>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden overflow-hidden border-t border-border/30"
            >
              <div className="py-4 space-y-2">
                {/* Mobile Search */}
                <SearchBar isOpen={true} onClose={() => setMobileMenuOpen(false)} isMobile />

                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.to}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      to={link.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-3 text-base font-medium text-foreground hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-pink-500/10 rounded-lg transition-colors"
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}

                <div className="border-t border-border/30 pt-4 mt-4">
                  {isAuthenticated && user ? (
                    <div className="space-y-2">
                      <Link
                        to="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-4 py-3 text-base font-medium text-foreground hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-pink-500/10 rounded-lg transition-colors"
                      >
                        Profile
                      </Link>
                      <Link
                        to="/orders"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-4 py-3 text-base font-medium text-foreground hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-pink-500/10 rounded-lg transition-colors"
                      >
                        Orders
                      </Link>
                      <Link
                        to="/wishlist"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block px-4 py-3 text-base font-medium text-foreground hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-pink-500/10 rounded-lg transition-colors"
                      >
                        Wishlist
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-3 text-base font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 px-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          navigate("/auth");
                          setMobileMenuOpen(false);
                        }}
                      >
                        Login
                      </Button>
                      <Button
                        className="w-full bg-gradient-to-r from-amber-500 to-pink-500"
                        onClick={() => {
                          navigate("/auth?tab=signup");
                          setMobileMenuOpen(false);
                        }}
                      >
                        Sign Up
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};
