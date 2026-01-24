import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PackageCheck, RotateCcw, Clock, CheckCircle2 } from "lucide-react";

const Returns = () => {
  const steps = [
    {
      icon: PackageCheck,
      title: "Request Return",
      description: "Log into your account and select the items you'd like to return from your order history."
    },
    {
      icon: RotateCcw,
      title: "Pack Items",
      description: "Place items in original packaging with tags attached. Include your return form."
    },
    {
      icon: Clock,
      title: "Ship Back",
      description: "Use the prepaid return label we provide. Drop off at any authorized shipping location."
    },
    {
      icon: CheckCircle2,
      title: "Get Refund",
      description: "Once we receive your return, we'll process your refund within 3-5 business days."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      {/* Hero Section */}
      <section className="hero-gradient py-20 border-b">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl mb-6">Returns & Exchanges</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Not completely satisfied? We make returns easy with our 30-day return policy.
          </p>
        </div>
      </section>

      {/* Return Process */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold mb-12 text-center">How to Return</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto mb-12">
          {steps.map((step, idx) => (
            <Card key={idx} className="p-6 text-center">
              <div className="inline-flex p-4 bg-accent/10 rounded-full mb-4">
                <step.icon className="h-8 w-8 text-accent" />
              </div>
              <div className="text-sm font-bold text-accent mb-2">Step {idx + 1}</div>
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-muted-foreground text-sm">{step.description}</p>
            </Card>
          ))}
        </div>
        <div className="text-center">
          <Button size="lg" className="gradient-primary btn-glow">Start a Return</Button>
        </div>
      </section>

      {/* Return Policy */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-8">Return Policy</h2>
            
            <div className="space-y-6 text-muted-foreground">
              <Card className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-3">Eligibility</h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li>Items must be returned within 30 days of delivery</li>
                  <li>Products must be unworn, unwashed, and in original condition</li>
                  <li>All original tags must be attached</li>
                  <li>Items must be in original packaging</li>
                  <li>Final sale items cannot be returned</li>
                </ul>
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-3">Return Shipping</h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li>We provide prepaid return labels for US orders</li>
                  <li>International customers are responsible for return shipping costs</li>
                  <li>Return shipping is free for exchanges</li>
                  <li>Defective or incorrect items receive free return shipping</li>
                </ul>
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-3">Refunds</h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li>Refunds are processed within 3-5 business days of receiving your return</li>
                  <li>Refunds will be issued to your original payment method</li>
                  <li>Original shipping costs are non-refundable</li>
                  <li>You'll receive an email confirmation once your refund is processed</li>
                </ul>
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-3">Exchanges</h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li>We recommend returning your item and placing a new order</li>
                  <li>This ensures you receive your preferred item as quickly as possible</li>
                  <li>Return shipping is free for exchanges</li>
                  <li>Contact customer service for exchange assistance</li>
                </ul>
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-3">Non-Returnable Items</h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li>Final sale items marked as such at checkout</li>
                  <li>Gift cards</li>
                  <li>Intimates and swimwear (for hygiene reasons)</li>
                  <li>Items damaged due to misuse or wear</li>
                  <li>Items returned without original tags</li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Need Help?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Our customer service team is here to assist with your return or exchange.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="outline">Contact Support</Button>
            <Button size="lg" variant="outline">View FAQ</Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Returns;
