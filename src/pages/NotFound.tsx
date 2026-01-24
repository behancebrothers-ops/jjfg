import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Home, Search, ShoppingBag } from "lucide-react";
import { logger } from "@/lib/logger";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logger.warn("404 Error: User attempted to access non-existent route", { pathname: location.pathname });
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-2xl">
          <h1 className="text-9xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Page Not Found</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Sorry, we couldn't find the page you're looking for. The page might have been moved or deleted.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/">
              <Button size="lg" className="w-full sm:w-auto">
                <Home className="h-5 w-5 mr-2" />
                Back to Home
              </Button>
            </Link>
            <Link to="/products">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <ShoppingBag className="h-5 w-5 mr-2" />
                Browse Products
              </Button>
            </Link>
          </div>

          <div className="mt-12 pt-8 border-t">
            <p className="text-sm text-muted-foreground mb-4">Popular Pages</p>
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <Link to="/new-arrivals" className="hover:text-accent transition-colors">New Arrivals</Link>
              <Link to="/about" className="hover:text-accent transition-colors">About Us</Link>
              <Link to="/contact" className="hover:text-accent transition-colors">Contact</Link>
              <Link to="/faq" className="hover:text-accent transition-colors">FAQ</Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default NotFound;
