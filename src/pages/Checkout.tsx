import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, Truck, Zap, CreditCard, Banknote, ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";
import { PromoCodeInput } from "@/components/PromoCodeInput";
import { motion } from "framer-motion";

interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  base_cost: number;
  estimated_days_min: number;
  estimated_days_max: number;
}

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, loading } = useCart();
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [appliedDiscount, setAppliedDiscount] = useState<{
    id: string;
    amount: number;
    type: string;
    value: number;
    code: string;
  } | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "cod">("cod");
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<ShippingMethod | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  });

  // Fetch shipping methods
  useEffect(() => {
    const fetchShippingMethods = async () => {
      const { data, error } = await supabase
        .from('shipping_methods')
        .select('*')
        .eq('active', true)
        .order('base_cost', { ascending: true });

      if (!error && data) {
        setShippingMethods(data);
        if (data.length > 0) {
          setSelectedShippingMethod(data[0]); // Default to cheapest
        }
      }
    };

    fetchShippingMethods();
  }, []);

  // Auto-fill user data from database
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) return;

        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        // Fetch default address or first available address
        const { data: addresses } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('user_id', session.user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1);

        const defaultAddress = addresses?.[0];

        // Auto-fill form with profile and address data
        if (profile || defaultAddress) {
          const fullName = defaultAddress?.full_name || profile?.full_name || "";
          const [firstName = "", ...lastNameParts] = fullName.split(" ");
          const lastName = lastNameParts.join(" ");

          setFormData({
            email: profile?.email || session.user.email || "",
            phone: defaultAddress?.phone || profile?.phone || "",
            firstName: firstName,
            lastName: lastName,
            address: defaultAddress?.address_line1 || profile?.address_line1 || "",
            city: defaultAddress?.city || profile?.city || "",
            state: defaultAddress?.state || profile?.state || "",
            zip: defaultAddress?.postal_code || profile?.postal_code || "",
            country: defaultAddress?.country || profile?.country || "",
          });

          if (profile || defaultAddress) {
            toast.success("Your information has been loaded", { duration: 2000 });
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (!loading && cartItems.length === 0) {
      toast.error("Your cart is empty");
      navigate("/cart");
    }
  }, [loading, cartItems, navigate]);

  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.product?.price || 0;
    const adjustment = item.variant?.price_adjustment || 0;
    return sum + (price + adjustment) * item.quantity;
  }, 0);

  const shipping = selectedShippingMethod?.base_cost ?? 9.99;
  const discountAmount = appliedDiscount?.amount ?? 0;
  const tax = (subtotal - discountAmount) * 0.08;
  const total = subtotal - discountAmount + shipping + tax;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });

    // Clear error when user starts typing
    if (errors[id]) {
      setErrors({ ...errors, [id]: "" });
    }
  };

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case "email":
        if (!value) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Invalid email format";
        return "";
      case "firstName":
      case "lastName":
        if (!value) return "This field is required";
        if (value.length < 2) return "Must be at least 2 characters";
        return "";
      case "address":
        if (!value) return "Address is required";
        if (value.length < 5) return "Address must be at least 5 characters";
        return "";
      case "city":
      case "state":
      case "country":
        if (!value) return "This field is required";
        return "";
      case "zip":
        if (!value) return "ZIP code is required";
        if (!/^\d{5}(-\d{4})?$/.test(value)) return "Invalid ZIP code format";
        return "";
      default:
        return "";
    }
  };

  const validateForm = (): boolean => {
    const required = ["email", "firstName", "lastName", "address", "city", "state", "zip", "country"];
    const newErrors: Record<string, string> = {};

    required.forEach(field => {
      const error = validateField(field, formData[field as keyof typeof formData]);
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStripeCheckout = async () => {
    // Validate form before processing
    if (!validateForm()) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    setProcessing(true);

    try {
      // Call Stripe checkout edge function
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          guest_shipping: {
            email: formData.email,
            phone: formData.phone,
            full_name: `${formData.firstName} ${formData.lastName}`.trim(),
            address_line1: formData.address,
            city: formData.city,
            state: formData.state,
            postal_code: formData.zip,
            country: formData.country,
          },
        },
      });

      if (error) {
        console.error('Stripe checkout error:', error);
        toast.error(error.message || "Failed to create checkout session");
        setProcessing(false);
        return;
      }

      if (data?.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        toast.error("Failed to get checkout URL");
        setProcessing(false);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error("An error occurred during checkout");
      setProcessing(false);
    }
  };

  const handlePlaceOrder = async () => {
    // Validate form before processing
    if (!validateForm()) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    setProcessing(true);

    try {
      const items = cartItems.map(item => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        price: (item.product?.price || 0) + (item.variant?.price_adjustment || 0),
      }));

      const { data, error } = await supabase.functions.invoke("checkout", {
        body: {
          items,
          guest_shipping: {
            email: formData.email,
            phone: formData.phone,
            full_name: `${formData.firstName} ${formData.lastName}`.trim(),
            address_line1: formData.address,
            city: formData.city,
            state: formData.state,
            postal_code: formData.zip,
            country: formData.country,
          },
          discount_code: appliedDiscount?.code,
          shipping_method_id: selectedShippingMethod?.id,
        },
      });

      if (error) {
        if (error.message?.includes("400") || error.message?.includes("Validation")) {
          toast.error("Invalid order data. Please check your information.");
          return;
        }
        throw error;
      }

      // Cash on Delivery - order is created, redirect to success
      toast.success("Order placed successfully! Pay on delivery.");

      // Clear local guest cart
      localStorage.removeItem('guest_cart');

      navigate(`/order-success?order=${data.order_number}`);

    } catch (error: any) {
      toast.error(error.message || "Checkout failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50/50 to-pink-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const inputClasses = "bg-white/50 border-white/60 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all backdrop-blur-sm";
  const labelClasses = "text-sm font-semibold text-gray-700 pl-1";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50/50 to-pink-50">
      <Navigation />

      <div className="container mx-auto px-4 py-12 flex-1">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Button variant="ghost" size="icon" className="rounded-full bg-white/40 hover:bg-white/60" onClick={() => navigate("/cart")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-4xl font-display font-bold">Checkout</h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-8 shadow-sm"
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-sm">1</div>
                Contact Information
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className={labelClasses}>Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={errors.email ? `${inputClasses} border-destructive` : inputClasses}
                      required
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className={labelClasses}>Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={inputClasses}
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Shipping Address */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-8 shadow-sm"
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-sm">2</div>
                Shipping Address
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className={labelClasses}>First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={errors.firstName ? `${inputClasses} border-destructive` : inputClasses}
                    required
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className={labelClasses}>Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={errors.lastName ? `${inputClasses} border-destructive` : inputClasses}
                    required
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.lastName}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address" className={labelClasses}>Address *</Label>
                  <Input
                    id="address"
                    placeholder="123 Main St"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={errors.address ? `${inputClasses} border-destructive` : inputClasses}
                    required
                  />
                  {errors.address && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.address}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city" className={labelClasses}>City *</Label>
                  <Input
                    id="city"
                    placeholder="New York"
                    value={formData.city}
                    onChange={handleInputChange}
                    className={errors.city ? `${inputClasses} border-destructive` : inputClasses}
                    required
                  />
                  {errors.city && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.city}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className={labelClasses}>State *</Label>
                  <Input
                    id="state"
                    placeholder="NY"
                    value={formData.state}
                    onChange={handleInputChange}
                    className={errors.state ? `${inputClasses} border-destructive` : inputClasses}
                    required
                  />
                  {errors.state && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.state}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip" className={labelClasses}>ZIP Code *</Label>
                  <Input
                    id="zip"
                    placeholder="10001"
                    value={formData.zip}
                    onChange={handleInputChange}
                    className={errors.zip ? `${inputClasses} border-destructive` : inputClasses}
                    required
                  />
                  {errors.zip && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.zip}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className={labelClasses}>Country *</Label>
                  <Input
                    id="country"
                    placeholder="United States"
                    value={formData.country}
                    onChange={handleInputChange}
                    className={errors.country ? `${inputClasses} border-destructive` : inputClasses}
                    required
                  />
                  {errors.country && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.country}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Delivery Method */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-8 shadow-sm"
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-sm">3</div>
                Delivery Method
              </h2>
              <div className="space-y-3">
                {shippingMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`border rounded-xl p-4 cursor-pointer transition-all ${selectedShippingMethod?.id === method.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/50 bg-white/40 hover:bg-white/60 hover:border-border"
                      }`}
                    onClick={() => setSelectedShippingMethod(method)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedShippingMethod?.id === method.id ? "border-primary" : "border-gray-300"}`}>
                        {selectedShippingMethod?.id === method.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {method.name.toLowerCase().includes('express') ? (
                            <Zap className="h-4 w-4 text-amber-500 fill-amber-500/20" />
                          ) : (
                            <Truck className="h-4 w-4 text-blue-500 fill-blue-500/20" />
                          )}
                          <h3 className="font-semibold">{method.name}</h3>
                          <span className="ml-auto font-bold text-primary">
                            ${method.base_cost.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 ml-6">
                          {method.description} ({method.estimated_days_min}-{method.estimated_days_max} business days)
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Payment Method */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/60 backdrop-blur-md border border-white/60 rounded-2xl p-8 shadow-sm"
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-sm">4</div>
                Payment Method
              </h2>
              <div className="space-y-6">
                {/* Payment Method Selection */}
                <div className="space-y-3">
                  <div
                    className={`border rounded-xl p-5 cursor-pointer transition-all ${paymentMethod === "cod"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/50 bg-white/40 hover:bg-white/60 hover:border-border"
                      }`}
                    onClick={() => setPaymentMethod("cod")}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${paymentMethod === "cod" ? "border-primary" : "border-gray-300"}`}>
                        {paymentMethod === "cod" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Banknote className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">Cash on Delivery</h3>
                        <p className="text-sm text-muted-foreground">
                          Pay with cash when your order is delivered to your doorstep
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`border rounded-xl p-5 cursor-pointer transition-all ${paymentMethod === "stripe"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/50 bg-white/40 hover:bg-white/60 hover:border-border"
                      }`}
                    onClick={() => setPaymentMethod("stripe")}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${paymentMethod === "stripe" ? "border-primary" : "border-gray-300"}`}>
                        {paymentMethod === "stripe" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">Credit/Debit Card</h3>
                        <p className="text-sm text-muted-foreground">
                          Secure online payment via Stripe (Credit Card, Debit Card)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Action Button */}
                {paymentMethod === "cod" ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-4"
                  >
                    <Alert className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800 rounded-xl">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <AlertDescription className="text-green-800 dark:text-green-200 ml-2">
                        You will pay in cash when your order arrives. Please keep the exact amount ready.
                      </AlertDescription>
                    </Alert>
                    <Button
                      onClick={handlePlaceOrder}
                      disabled={processing || cartItems.length === 0}
                      className="w-full h-12 text-lg gradient-primary btn-glow shadow-lg"
                      size="lg"
                    >
                      {processing ? "Processing Order..." : "Place Order Now"}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-4"
                  >
                    <Alert className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 rounded-xl">
                      <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <AlertDescription className="text-blue-800 dark:text-blue-200 ml-2">
                        You'll be securely redirected to Stripe to complete your payment with full 256-bit encryption.
                      </AlertDescription>
                    </Alert>
                    <Button
                      onClick={handleStripeCheckout}
                      disabled={processing || cartItems.length === 0}
                      className="w-full h-12 text-lg gradient-primary btn-glow shadow-lg"
                      size="lg"
                    >
                      {processing ? "Connecting to Secure Gateway..." : "Proceed to Secure Payment"}
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-6 sticky top-24 shadow-lg shadow-amber-500/5"
            >
              <h2 className="text-2xl font-display font-bold mb-6">Order Summary</h2>

              <div className="space-y-3 mb-6 bg-white/40 p-4 rounded-xl border border-white/40">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-2 border-b border-dashed border-gray-200 last:border-0">
                    <span className="font-medium pr-2">
                      {item.product?.name} <span className="text-muted-foreground text-xs">x{item.quantity}</span>
                      <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {item.variant && `${item.variant.size || ""} ${item.variant.color || ""}`}
                      </div>
                    </span>
                    <span>${((item.product?.price || 0) + (item.variant?.price_adjustment || 0)) * item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Promo Code */}
              <div className="mb-6 pb-6 border-b border-dashed border-gray-300">
                <label className="text-sm font-semibold mb-2 block text-gray-700">Have a Promo Code?</label>
                <PromoCodeInput
                  subtotal={subtotal}
                  onDiscountApplied={setAppliedDiscount}
                  onDiscountRemoved={() => setAppliedDiscount(undefined)}
                  appliedDiscount={appliedDiscount}
                />
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold text-foreground">${subtotal.toFixed(2)}</span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between text-amber-600 bg-amber-50 p-2 rounded-lg">
                    <span className="font-medium flex items-center gap-1"><Zap className="h-3 w-3" /> Discount ({appliedDiscount.code})</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Shipping ({selectedShippingMethod?.name || 'Standard'})
                  </span>
                  <span className="font-semibold text-foreground">${shipping.toFixed(2)}</span>
                </div>
                {selectedShippingMethod && (
                  <div className="text-xs text-muted-foreground text-right -mt-1">
                    Est: {selectedShippingMethod.estimated_days_min}-{selectedShippingMethod.estimated_days_max} days
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (8%)</span>
                  <span className="font-semibold text-foreground">${tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-4 mt-2 flex justify-between items-end">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-3xl bg-gradient-to-r from-amber-600 to-pink-600 bg-clip-text text-transparent">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="text-center text-xs text-muted-foreground bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p>Proceed to checkout to complete your purchase.</p>
                <p className="mt-1">By placing your order, you agree to our Terms & Conditions</p>
              </div>

              <div className="mt-6 flex items-center justify-center gap-4 text-gray-400">
                <CreditCard className="h-6 w-6" />
                <ShieldCheck className="h-6 w-6" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Checkout;
