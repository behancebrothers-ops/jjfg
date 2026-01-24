import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Menu, LogOut, X, Settings, Shield, LayoutDashboard, Sparkles,
  Package, ShoppingCart, Users, Tag, RotateCcw, Percent, ShoppingBag,
  Star, Briefcase, FileText, UserCheck, BarChart3, Bell, RefreshCw, Zap, Image, Mail
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "@/lib/logger";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function AdminNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [scrolled, setScrolled] = useState(false);
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    const getAdminData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setAdminEmail(user.email || "");

      // Fetch pending orders count
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingOrders(count || 0);
    };
    getAdminData();

    // Set up realtime subscription for orders
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
        const { count } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        setPendingOrders(count || 0);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/admin/auth");
    } catch (error) {
      logger.error("Logout failed", error);
    }
  };

  const navLinks = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/admin/products", label: "Products", icon: Package },
    { to: "/admin/categories", label: "Categories", icon: Tag },
    { to: "/admin/sale", label: "Sale", icon: Zap },
    { to: "/admin/advertisements", label: "Ads", icon: Image },
    { to: "/admin/orders", label: "Orders", icon: ShoppingCart, badge: pendingOrders },
    { to: "/admin/customers", label: "Customers", icon: Users },
    { to: "/admin/returns", label: "Returns", icon: RotateCcw },
    { to: "/admin/discount-codes", label: "Promo Codes", icon: Percent },
    { to: "/admin/abandoned-carts", label: "Abandoned Carts", icon: ShoppingBag },
    { to: "/admin/reviews", label: "Reviews", icon: Star },
    { to: "/admin/job-postings", label: "Job Postings", icon: Briefcase },
    { to: "/admin/job-applications", label: "Applications", icon: FileText },
    { to: "/admin/emails", label: "Email Marketing", icon: Mail },
    { to: "/admin/email-templates", label: "Email Templates", icon: FileText },
    { to: "/admin/employees", label: "Employees", icon: UserCheck },
  ];

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase();
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
        ? "bg-card/95 backdrop-blur-xl border-b border-border shadow-lg"
        : "bg-card/80 backdrop-blur-md border-b border-border/50"
        }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo Section with Animation */}
          <div className="flex items-center gap-8">
            <Link to="/admin" className="relative group">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2"
              >
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(59, 130, 246, 0)",
                      "0 0 20px 5px rgba(59, 130, 246, 0.3)",
                      "0 0 0 0 rgba(59, 130, 246, 0)",
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                  className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600"
                >
                  <Shield className="h-5 w-5 text-white" />
                </motion.div>
                <div>
                  <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Thread Admin
                  </div>
                  <div className="text-[10px] text-muted-foreground -mt-1">Control Panel</div>
                </div>
              </motion.div>
            </Link>

            {/* Desktop Navigation with Hover Effects */}
            <div className="hidden xl:flex gap-1">
              {navLinks.slice(0, 6).map((link, index) => {
                const active = isActive(link.to);
                const LinkIcon = link.icon;
                return (
                  <Tooltip key={link.to}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link to={link.to}>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                              "relative px-3 py-2 rounded-lg text-sm font-medium transition-all",
                              active
                                ? "text-foreground bg-gradient-to-r from-blue-500/10 to-purple-500/10"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                          >
                            <span className="relative z-10 flex items-center gap-2">
                              {LinkIcon && <LinkIcon className="h-4 w-4" />}
                              {link.label}
                              {link.badge && link.badge > 0 && (
                                <Badge className="h-5 w-5 p-0 flex items-center justify-center bg-gradient-to-r from-rose-500 to-pink-500 text-white border-0 text-[10px] font-bold animate-pulse">
                                  {link.badge > 99 ? '99+' : link.badge}
                                </Badge>
                              )}
                            </span>
                            {active && (
                              <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                              />
                            )}
                          </motion.div>
                        </Link>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{link.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {/* More dropdown for additional links */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    More...
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 bg-card/95 backdrop-blur-xl border-border/50">
                  {navLinks.slice(6).map((link) => {
                    const LinkIcon = link.icon;
                    return (
                      <DropdownMenuItem
                        key={link.to}
                        onClick={() => navigate(link.to)}
                        className="cursor-pointer hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10"
                      >
                        {LinkIcon && <LinkIcon className="mr-2 h-4 w-4" />}
                        {link.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Right Section with Animations */}
          <div className="flex items-center gap-3">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/">
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:flex relative overflow-hidden group border-border/50"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Sparkles className="mr-2 h-4 w-4 relative z-10" />
                  <span className="relative z-10">View Store</span>
                </Button>
              </Link>
            </motion.div>

            {/* Admin Profile Dropdown with Animation */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                    <Avatar className="h-10 w-10 border-2 border-transparent bg-gradient-to-br from-blue-500 to-purple-600 p-[2px]">
                      <AvatarFallback className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 text-blue-600 dark:text-blue-400 font-semibold">
                        {getInitials(adminEmail)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background animate-pulse" />
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 bg-card/95 backdrop-blur-xl border-border/50" align="end" forceMount>
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
                          Admin
                        </Badge>
                      </div>
                      <p className="text-sm font-medium leading-none">Admin Account</p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {adminEmail}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate("/admin/settings")}
                    className="cursor-pointer hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Account Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer hover:bg-destructive/10 text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </motion.div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="xl:hidden rounded-full"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Animated Mobile Navigation */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="xl:hidden overflow-hidden border-t border-border/50"
            >
              <div className="py-3 space-y-1 max-h-[60vh] overflow-y-auto">
                {navLinks.map((link, index) => {
                  const active = isActive(link.to);
                  const LinkIcon = link.icon;
                  return (
                    <motion.div
                      key={link.to}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        to={link.to}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all",
                          active
                            ? "bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-foreground font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        {LinkIcon && <LinkIcon className="h-4 w-4" />}
                        {link.label}
                        {link.badge && link.badge > 0 && (
                          <Badge className="ml-2 h-5 px-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white border-0 text-[10px] font-bold">
                            {link.badge}
                          </Badge>
                        )}
                        {active && (
                          <Badge className="ml-auto bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 text-xs">
                            Active
                          </Badge>
                        )}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
