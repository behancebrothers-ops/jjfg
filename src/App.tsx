import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "@/lib/queryClient";
import { ProtectedAdminRoute } from "@/components/admin/ProtectedAdminRoute";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useRoutePreload } from "@/hooks/useRoutePreload";
import { usePageTracking } from "@/hooks/usePageTracking";
import { PageLoader } from "@/components/PageLoader";

// Lazy load all pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Auth = lazy(() => import("./pages/Auth"));
const AdminAuth = lazy(() => import("./pages/AdminAuth"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/AdminProducts"));
const AdminCategories = lazy(() => import("./pages/AdminCategories"));
const AdminOrders = lazy(() => import("./pages/AdminOrders"));
const AdminDiscountCodes = lazy(() => import("./pages/AdminDiscountCodes"));
const AdminAccountSettings = lazy(() => import("./pages/AdminAccountSettings"));
const AdminEmployees = lazy(() => import("./pages/AdminEmployees"));
const AdminEmails = lazy(() => import("./pages/AdminEmails"));
const AdminEmailTemplates = lazy(() => import("./pages/AdminEmailTemplates"));
const AdminReviews = lazy(() => import("./pages/AdminReviews"));
const AdminJobPostings = lazy(() => import("./pages/AdminJobPostings"));
const AdminJobApplications = lazy(() => import("./pages/AdminJobApplications"));
const AdminCustomers = lazy(() => import("./pages/AdminCustomers"));
const AdminReturns = lazy(() => import("./pages/AdminReturns"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminAbandonedCarts = lazy(() => import("./pages/AdminAbandonedCarts"));
const AdminSale = lazy(() => import("./pages/AdminSale"));
const AdminAdvertisements = lazy(() => import("./pages/AdminAdvertisements"));
const NewArrivals = lazy(() => import("./pages/NewArrivals"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Careers = lazy(() => import("./pages/Careers"));
const Returns = lazy(() => import("./pages/Returns"));
const ShippingInfo = lazy(() => import("./pages/ShippingInfo"));
const Contact = lazy(() => import("./pages/Contact"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Profile = lazy(() => import("./pages/Profile"));
const OrderHistory = lazy(() => import("./pages/OrderHistory"));
const Search = lazy(() => import("./pages/Search"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const Terms = lazy(() => import("./pages/Terms"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const SizeGuide = lazy(() => import("./pages/SizeGuide"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Sale = lazy(() => import("./pages/Sale"));

const AppContent = () => {
  useRoutePreload();
  usePageTracking();
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            {/* Redirect old product URLs to new format */}
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/shipping" element={<ShippingInfo />} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/size-guide" element={<SizeGuide />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
            <Route path="/track-order" element={<TrackOrder />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/new-arrivals" element={<NewArrivals />} />
            <Route path="/sale" element={<Sale />} />
            <Route path="/search" element={<Search />} />
            <Route path="/account-settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/admin/auth" element={<AdminAuth />} />
            <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
            <Route path="/admin/products" element={<ProtectedAdminRoute><AdminProducts /></ProtectedAdminRoute>} />
            <Route path="/admin/categories" element={<ProtectedAdminRoute><AdminCategories /></ProtectedAdminRoute>} />
            <Route path="/admin/orders" element={<ProtectedAdminRoute><AdminOrders /></ProtectedAdminRoute>} />
            <Route path="/admin/discount-codes" element={<ProtectedAdminRoute><AdminDiscountCodes /></ProtectedAdminRoute>} />
            <Route path="/admin/settings" element={<AdminAccountSettings />} />
            <Route path="/admin/employees" element={<ProtectedAdminRoute><AdminEmployees /></ProtectedAdminRoute>} />
            <Route path="/admin/reviews" element={<ProtectedAdminRoute><AdminReviews /></ProtectedAdminRoute>} />
            <Route path="/admin/job-postings" element={<ProtectedAdminRoute><AdminJobPostings /></ProtectedAdminRoute>} />
            <Route path="/admin/job-applications" element={<ProtectedAdminRoute><AdminJobApplications /></ProtectedAdminRoute>} />
            <Route path="/admin/emails" element={<ProtectedAdminRoute><AdminEmails /></ProtectedAdminRoute>} />
            <Route path="/admin/email-templates" element={<ProtectedAdminRoute><AdminEmailTemplates /></ProtectedAdminRoute>} />
            <Route path="/admin/customers" element={<ProtectedAdminRoute><AdminCustomers /></ProtectedAdminRoute>} />
            <Route path="/admin/returns" element={<ProtectedAdminRoute><AdminReturns /></ProtectedAdminRoute>} />
            <Route path="/admin/analytics" element={<ProtectedAdminRoute><AdminAnalytics /></ProtectedAdminRoute>} />
            <Route path="/admin/abandoned-carts" element={<ProtectedAdminRoute><AdminAbandonedCarts /></ProtectedAdminRoute>} />
            <Route path="/admin/sale" element={<ProtectedAdminRoute><AdminSale /></ProtectedAdminRoute>} />
            <Route path="/admin/advertisements" element={<ProtectedAdminRoute><AdminAdvertisements /></ProtectedAdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
