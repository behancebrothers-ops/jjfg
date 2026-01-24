import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";

const Cart = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const {
    cartItems,
    loading,
    updateQuantity,
    removeFromCart
  } = useCart();
  useEffect(() => {
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setIsAuthenticated(!!session);
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);
  const subtotal = cartItems.reduce((sum, item) => {
    if (!item.product) return sum;
    const basePrice = item.product.price ?? 0;
    const variantAdjustment = item.variant?.price_adjustment ?? 0;
    const itemPrice = basePrice + variantAdjustment;
    return sum + itemPrice * item.quantity;
  }, 0);
  const shipping = subtotal > 100 ? 0 : 10;
  const total = Math.max(0, subtotal + shipping);
  const handleCheckout = () => {
    if (!isAuthenticated) {
      setShowLoginDialog(true);
    } else {
      navigate("/checkout");
    }
  };
  if (loading) {
    return <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50/50 to-pink-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8 flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading cart...</p>
        </div>
      </div>
      <Footer />
    </div>;
  }
  return <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50/50 to-pink-50">
    <Navigation />

    <div className="container mx-auto px-4 py-12 flex-1">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-8"
      >
        <div className="p-3 bg-white/50 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm">
          <ShoppingBag className="h-6 w-6 text-amber-600" />
        </div>
        <h1 className="text-4xl font-display font-bold text-foreground">Shopping Cart</h1>
        <span className="text-muted-foreground font-medium ml-2">({cartItems.length} items)</span>
      </motion.div>

      {cartItems.length === 0 ?
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-24 bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 shadow-xl"
        >
          <div className="w-20 h-20 bg-amber-100/50 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-600">
            <ShoppingBag className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Your cart is empty</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
            Looks like you haven't added anything to your cart yet. Discover our premium collection.
          </p>
          <Link to="/products">
            <Button size="lg" className="gradient-primary shadow-lg hover:shadow-xl transition-all hover:scale-105">
              Start Shopping
            </Button>
          </Link>
        </motion.div>
        :
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            <AnimatePresence>
              {cartItems.map((item, index) => {
                const basePrice = item.product?.price ?? 0;
                const variantAdjustment = item.variant?.price_adjustment ?? 0;
                const itemPrice = basePrice + variantAdjustment;
                const itemTotal = itemPrice * item.quantity;
                if (!item.product) return null;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex gap-4 p-5 bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="w-28 h-36 overflow-hidden rounded-xl bg-muted flex-shrink-0 border border-white/50 shadow-sm">
                      {item.product.image_url ?
                        <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        :
                        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">No Image</div>
                      }
                    </div>

                    <div className="flex-1 flex flex-col justify-between min-w-0 py-1">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-semibold text-lg truncate pr-2">{item.product.name}</h3>
                          <p className="font-bold text-lg text-primary">${itemTotal.toFixed(2)}</p>
                        </div>
                        {item.variant && (item.variant.size || item.variant.color) && (
                          <div className="flex gap-2 mt-2">
                            {item.variant.size && (
                              <span className="text-xs font-medium bg-white/80 px-2 py-1 rounded-md border border-border">
                                Size: {item.variant.size}
                              </span>
                            )}
                            {item.variant.color && (
                              <span className="text-xs font-medium bg-white/80 px-2 py-1 rounded-md border border-border">
                                Color: {item.variant.color}
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground mt-2">
                          ${itemPrice.toFixed(2)} / unit
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center bg-white/80 rounded-lg border border-border/50 p-1 shadow-sm">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-black/5 rounded-md"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-10 text-center text-sm font-semibold">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-black/5 rounded-md"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-2"
                          onClick={() => removeFromCart(item.id)}
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              }).filter(Boolean)}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-6 sticky top-24 shadow-lg shadow-amber-500/5"
            >
              <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
                Order Summary
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-semibold text-foreground">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Shipping</span>
                  <span className="font-semibold text-foreground">
                    {shipping === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-4" />
                <div className="flex justify-between items-end">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-2xl bg-gradient-to-r from-amber-600 to-pink-600 bg-clip-text text-transparent">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full h-12 mb-4 gradient-primary shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] text-lg font-semibold"
                onClick={handleCheckout}
              >
                Proceed to Checkout
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <Link to="/products">
                <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground">
                  Continue Shopping
                </Button>
              </Link>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <div className="h-1 w-1 rounded-full bg-slate-300" />
                <span>Secure Checkout</span>
                <div className="h-1 w-1 rounded-full bg-slate-300" />
                <span>Money-back Guarantee</span>
              </div>
            </motion.div>
          </div>
        </div>
      }
    </div>

    <Footer />

    <AlertDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
      <AlertDialogContent className="bg-white/90 backdrop-blur-xl border border-white/60">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-2xl">Login Required</AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            You need to log in or create an account to proceed with checkout.
            Your cart items will be saved for you.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Continue Shopping</AlertDialogCancel>
          <AlertDialogAction asChild className="rounded-xl gradient-primary border-0">
            <Link to="/auth">Log In / Sign Up</Link>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
};
export default Cart;