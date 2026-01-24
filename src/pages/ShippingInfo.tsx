import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Truck, Globe, Package, Zap } from "lucide-react";

const ShippingInfo = () => {
  const shippingOptions = [
    {
      icon: Truck,
      name: "Standard Shipping",
      time: "3-5 Business Days",
      cost: "Free on orders over $100",
      description: "Reliable delivery to your doorstep with tracking included."
    },
    {
      icon: Zap,
      name: "Express Shipping",
      time: "1-2 Business Days",
      cost: "$15.00",
      description: "Fast delivery for when you need it quickly."
    },
    {
      icon: Package,
      name: "Next Day Delivery",
      time: "1 Business Day",
      cost: "$25.00",
      description: "Order by 2 PM for next day delivery (select areas only)."
    },
    {
      icon: Globe,
      name: "International",
      time: "7-14 Business Days",
      cost: "Varies by location",
      description: "Worldwide shipping with customs assistance."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      {/* Hero Section */}
      <section className="hero-gradient py-20 border-b">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl mb-6">Shipping Information</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Fast, reliable shipping to get your order to you as quickly as possible.
          </p>
        </div>
      </section>

      {/* Shipping Options */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold mb-12 text-center">Shipping Options</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {shippingOptions.map((option, idx) => (
            <Card key={idx} className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-accent/10 rounded-lg flex-shrink-0">
                  <option.icon className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">{option.name}</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-medium text-accent">{option.time}</span>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm font-medium">{option.cost}</span>
                  </div>
                  <p className="text-muted-foreground text-sm">{option.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Shipping Details */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            <Card className="p-8">
              <h2 className="text-3xl font-bold mb-6">Shipping Details</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3">Processing Time</h3>
                  <p className="text-muted-foreground">
                    Orders are typically processed within 1-2 business days. Orders placed on 
                    weekends or holidays will be processed the next business day. You'll receive 
                    a confirmation email once your order ships with tracking information.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Order Tracking</h3>
                  <p className="text-muted-foreground">
                    All orders include tracking information. Once your order ships, you'll receive 
                    an email with your tracking number and a link to track your package in real-time. 
                    You can also track orders by logging into your account.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Shipping Carriers</h3>
                  <p className="text-muted-foreground">
                    We partner with trusted carriers including USPS, UPS, and FedEx to ensure your 
                    orders arrive safely and on time. The carrier used for your order will depend 
                    on your location and selected shipping method.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Signature Requirements</h3>
                  <p className="text-muted-foreground">
                    For orders over $300, adult signature confirmation is required upon delivery. 
                    This ensures your valuable items are delivered securely. If you won't be home, 
                    the carrier will leave a notice for pickup or redelivery.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-8">
              <h2 className="text-3xl font-bold mb-6">International Shipping</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3">Countries We Ship To</h3>
                  <p className="text-muted-foreground">
                    We currently ship to over 100 countries worldwide. Shipping times and costs 
                    vary by destination. International orders may be subject to customs fees and 
                    import duties, which are the responsibility of the customer.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Customs & Duties</h3>
                  <p className="text-muted-foreground">
                    International customers are responsible for any customs fees, duties, or taxes 
                    imposed by their country. These fees are determined by your local customs office 
                    and are not included in your order total. We recommend checking with your local 
                    customs office for more information.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">Currency & Pricing</h3>
                  <p className="text-muted-foreground">
                    All prices are listed in USD. Your credit card company or bank will convert the 
                    amount to your local currency. Exchange rates and conversion fees may apply.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-8">
              <h2 className="text-3xl font-bold mb-6">Delivery Issues</h2>
              
              <div className="space-y-4 text-muted-foreground">
                <p>
                  <strong className="text-foreground">Missing or Stolen Packages:</strong> If your 
                  tracking shows delivered but you haven't received your package, please check with 
                  neighbors and your building's front desk. Contact us within 48 hours and we'll help 
                  resolve the issue.
                </p>
                <p>
                  <strong className="text-foreground">Damaged Packages:</strong> If your order arrives 
                  damaged, please take photos and contact us immediately. We'll arrange for a replacement 
                  or refund right away.
                </p>
                <p>
                  <strong className="text-foreground">Wrong Address:</strong> Please double-check your 
                  shipping address before placing your order. If you need to update your address after 
                  ordering, contact us immediately. Once shipped, we cannot change the delivery address.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Questions About Shipping?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Our customer service team is here to help with any shipping questions or concerns.
          </p>
          <a href="/contact" className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
            Contact Us
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ShippingInfo;
