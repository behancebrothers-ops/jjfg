import { useMemo } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SEOHead, generateFAQSchema } from "@/components/SEOHead";

const FAQ = () => {
  const faqs = [
    {
      category: "Orders & Shipping",
      questions: [
        {
          q: "How long does shipping take?",
          a: "Standard shipping typically takes 3-5 business days within the continental US. Express shipping options are available at checkout for 1-2 day delivery."
        },
        {
          q: "Do you ship internationally?",
          a: "Yes! We ship to over 100 countries worldwide. International shipping times vary by location, typically 7-14 business days. Customs fees may apply."
        },
        {
          q: "Can I track my order?",
          a: "Absolutely. Once your order ships, you'll receive a tracking number via email. You can also track your order by logging into your account."
        },
        {
          q: "What if my order arrives damaged?",
          a: "We're sorry if that happens! Contact us within 48 hours of delivery with photos, and we'll arrange a replacement or full refund immediately."
        }
      ]
    },
    {
      category: "Returns & Exchanges",
      questions: [
        {
          q: "What is your return policy?",
          a: "We offer 30-day returns on all unworn, unwashed items with original tags attached. Items must be in original condition for a full refund."
        },
        {
          q: "How do I start a return?",
          a: "Log into your account, go to Order History, select the item you'd like to return, and follow the prompts. You'll receive a prepaid return label."
        },
        {
          q: "Can I exchange an item?",
          a: "Yes! Follow the return process and place a new order for the item you'd like. This ensures you get your preferred item as quickly as possible."
        },
        {
          q: "When will I receive my refund?",
          a: "Refunds are processed within 3-5 business days of receiving your return. The refund will appear on your original payment method within 5-10 business days."
        }
      ]
    },
    {
      category: "Products & Sizing",
      questions: [
        {
          q: "How do I find my size?",
          a: "Each product page includes a detailed size guide. We recommend measuring yourself and comparing to our charts for the best fit."
        },
        {
          q: "Are your products true to size?",
          a: "Most items run true to size, but we include specific fit notes on each product page (e.g., 'runs small' or 'relaxed fit')."
        },
        {
          q: "What materials do you use?",
          a: "We use high-quality, sustainable materials including organic cotton, premium wool, silk blends, and ethically sourced leather."
        },
        {
          q: "How should I care for my items?",
          a: "Care instructions are included on each product's tag and product page. Most items are machine washable, but we recommend following specific care guidelines."
        }
      ]
    },
    {
      category: "Account & Payment",
      questions: [
        {
          q: "Do I need an account to place an order?",
          a: "No, you can checkout as a guest. However, creating an account lets you track orders, save favorites, and checkout faster."
        },
        {
          q: "What payment methods do you accept?",
          a: "We accept all major credit cards (Visa, Mastercard, American Express, Discover), PayPal, Apple Pay, and Google Pay."
        },
        {
          q: "Is my payment information secure?",
          a: "Yes, we use industry-standard SSL encryption to protect your information. We never store your complete payment details."
        },
        {
          q: "Can I use multiple discount codes?",
          a: "Only one discount code can be applied per order, but the system will automatically apply the best available discount for you."
        }
      ]
    }
  ];

  // Generate FAQ structured data for SEO
  const faqStructuredData = useMemo(() => {
    const allFaqs = faqs.flatMap(section => 
      section.questions.map(q => ({ question: q.q, answer: q.a }))
    );
    return generateFAQSchema(allFaqs);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="FAQ - Frequently Asked Questions | LUXE"
        description="Find answers to common questions about LUXE orders, shipping, returns, sizing, and more. Get help with your fashion shopping experience."
        keywords="faq, frequently asked questions, shipping info, return policy, sizing help, customer support"
        canonicalUrl="/faq"
        structuredData={faqStructuredData}
      />
      <Navigation />
      
      {/* Hero Section */}
      <section className="hero-gradient py-20 border-b">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl mb-6">Frequently Asked Questions</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Find answers to common questions about orders, shipping, returns, and more.
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-12">
          {faqs.map((section, idx) => (
            <div key={idx}>
              <h2 className="text-3xl font-bold mb-6">{section.category}</h2>
              <Accordion type="single" collapsible className="space-y-4">
                {section.questions.map((faq, qIdx) => (
                  <AccordionItem key={qIdx} value={`${idx}-${qIdx}`} className="border rounded-lg px-6">
                    <AccordionTrigger className="text-left font-semibold hover:no-underline">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        {/* Still have questions */}
        <div className="max-w-4xl mx-auto mt-16 text-center p-8 bg-muted/30 rounded-lg">
          <h3 className="text-2xl font-bold mb-3">Still have questions?</h3>
          <p className="text-muted-foreground mb-6">
            Our customer service team is here to help
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

export default FAQ;
