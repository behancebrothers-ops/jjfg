import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { FacebookIcon, InstagramIcon, WhatsAppIcon, XIcon } from "@/components/SocialIcons";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export const Footer = () => {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast({
        title: "Success!",
        description: "Thank you for subscribing to our newsletter.",
      });
      setEmail("");
    }
  };

  return (
    <footer className="border-t glass-card mt-20">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="text-2xl font-bold tracking-tighter mb-4 font-serif">
              <span className="text-gradient">SCENT LUXE</span>
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Premium fragrances for the modern connoisseur. Elevate your presence with our curated collection of luxurious scents.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="hover-lift hover:text-primary transition-all text-muted-foreground"
                aria-label="Follow us on Facebook"
              >
                <FacebookIcon className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="hover-lift hover:text-primary transition-all text-muted-foreground"
                aria-label="Follow us on Instagram"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="hover-lift hover:text-primary transition-all text-muted-foreground"
                aria-label="Chat on WhatsApp"
              >
                <WhatsAppIcon className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="hover-lift hover:text-primary transition-all text-muted-foreground"
                aria-label="Follow us on X (formerly Twitter)"
              >
                <XIcon className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Shop</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link to="/products?category=perfumes" className="hover:text-primary transition-colors hover-lift inline-block">
                  Perfumes
                </Link>
              </li>
              <li>
                <Link to="/products?category=home-scents" className="hover:text-primary transition-colors hover-lift inline-block">
                  Home Fragrances
                </Link>
              </li>
              <li>
                <Link to="/new-arrivals" className="hover:text-primary transition-colors hover-lift inline-block">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link to="/products?category=gift-sets" className="hover:text-primary transition-colors hover-lift inline-block">
                  Gift Sets
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Support</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link to="/contact" className="hover:text-primary transition-colors hover-lift inline-block">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/shipping" className="hover:text-primary transition-colors hover-lift inline-block">
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link to="/returns" className="hover:text-primary transition-colors hover-lift inline-block">
                  Returns
                </Link>
              </li>
              <li>
                <Link to="/track-order" className="hover:text-primary transition-colors hover-lift inline-block">
                  Track Order
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-primary transition-colors hover-lift inline-block">
                  Scent Guide
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-primary transition-colors hover-lift inline-block">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Company</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link to="/about" className="hover:text-primary transition-colors hover-lift inline-block">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-primary transition-colors hover-lift inline-block">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/careers" className="hover:text-primary transition-colors hover-lift inline-block">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-primary transition-colors hover-lift inline-block">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-primary transition-colors hover-lift inline-block">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h4 className="font-semibold mb-4 text-foreground">Stay Updated</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="pl-9 bg-background/50 border-muted"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© 2025 SCENT LUXE. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
