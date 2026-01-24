import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      {/* Hero Section */}
      <section className="hero-gradient py-20 border-b">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl mb-6">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: January 2025</p>
        </div>
      </section>

      {/* Content */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="p-8">
            <div className="prose prose-lg max-w-none">
              <h2 className="text-3xl font-bold mb-4">Introduction</h2>
              <p className="text-muted-foreground mb-6">
                At LUXE, we take your privacy seriously. This Privacy Policy explains how we collect, 
                use, disclose, and safeguard your information when you visit our website or make a 
                purchase from us. Please read this privacy policy carefully.
              </p>

              <h2 className="text-3xl font-bold mb-4 mt-12">Information We Collect</h2>
              
              <h3 className="text-2xl font-semibold mb-3 mt-8">Personal Information</h3>
              <p className="text-muted-foreground mb-4">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-6">
                <li>Name, email address, and phone number</li>
                <li>Billing and shipping addresses</li>
                <li>Payment information (processed securely by our payment providers)</li>
                <li>Order history and preferences</li>
                <li>Account credentials</li>
                <li>Communication preferences</li>
              </ul>

              <h3 className="text-2xl font-semibold mb-3 mt-8">Automatically Collected Information</h3>
              <p className="text-muted-foreground mb-4">
                When you visit our website, we automatically collect certain information about your device, including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-6">
                <li>IP address and browser type</li>
                <li>Operating system and device information</li>
                <li>Pages visited and time spent on pages</li>
                <li>Referring website addresses</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>

              <h2 className="text-3xl font-bold mb-4 mt-12">How We Use Your Information</h2>
              <p className="text-muted-foreground mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-6">
                <li>Process and fulfill your orders</li>
                <li>Communicate with you about your orders and account</li>
                <li>Send you marketing communications (with your consent)</li>
                <li>Improve and personalize your shopping experience</li>
                <li>Detect and prevent fraud</li>
                <li>Comply with legal obligations</li>
                <li>Analyze website usage and trends</li>
              </ul>

              <h2 className="text-3xl font-bold mb-4 mt-12">Information Sharing</h2>
              <p className="text-muted-foreground mb-4">
                We may share your information with:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-6">
                <li><strong className="text-foreground">Service Providers:</strong> Third-party companies that help us operate our business (payment processors, shipping carriers, email service providers)</li>
                <li><strong className="text-foreground">Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong className="text-foreground">Business Transfers:</strong> In connection with a merger, sale, or acquisition</li>
              </ul>
              <p className="text-muted-foreground mb-6">
                We do not sell your personal information to third parties.
              </p>

              <h2 className="text-3xl font-bold mb-4 mt-12">Cookies and Tracking</h2>
              <p className="text-muted-foreground mb-4">
                We use cookies and similar tracking technologies to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-6">
                <li>Remember your preferences and settings</li>
                <li>Keep you logged in to your account</li>
                <li>Analyze website traffic and usage patterns</li>
                <li>Deliver targeted advertising</li>
              </ul>
              <p className="text-muted-foreground mb-6">
                You can control cookies through your browser settings, but disabling cookies may limit 
                some features of our website.
              </p>

              <h2 className="text-3xl font-bold mb-4 mt-12">Data Security</h2>
              <p className="text-muted-foreground mb-6">
                We implement appropriate technical and organizational measures to protect your personal 
                information. However, no method of transmission over the internet or electronic storage 
                is 100% secure. While we strive to protect your information, we cannot guarantee absolute 
                security.
              </p>

              <h2 className="text-3xl font-bold mb-4 mt-12">Your Rights</h2>
              <p className="text-muted-foreground mb-4">
                Depending on your location, you may have the following rights:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-6">
                <li>Access to your personal information</li>
                <li>Correction of inaccurate information</li>
                <li>Deletion of your information</li>
                <li>Opt-out of marketing communications</li>
                <li>Data portability</li>
                <li>Object to processing of your information</li>
              </ul>

              <h2 className="text-3xl font-bold mb-4 mt-12">Children's Privacy</h2>
              <p className="text-muted-foreground mb-6">
                Our website is not intended for children under 13 years of age. We do not knowingly 
                collect personal information from children under 13.
              </p>

              <h2 className="text-3xl font-bold mb-4 mt-12">International Transfers</h2>
              <p className="text-muted-foreground mb-6">
                Your information may be transferred to and processed in countries other than your own. 
                We ensure appropriate safeguards are in place to protect your information in accordance 
                with this privacy policy.
              </p>

              <h2 className="text-3xl font-bold mb-4 mt-12">Changes to This Policy</h2>
              <p className="text-muted-foreground mb-6">
                We may update this privacy policy from time to time. We will notify you of any changes 
                by posting the new policy on this page and updating the "Last Updated" date.
              </p>

              <h2 className="text-3xl font-bold mb-4 mt-12">Contact Us</h2>
              <p className="text-muted-foreground mb-2">
                If you have questions about this privacy policy or our privacy practices, please contact us:
              </p>
              <div className="text-muted-foreground space-y-1">
                <p>Email: privacy@luxe.com</p>
                <p>Phone: +1 (555) 123-4567</p>
                <p>Address: 123 Fashion Ave, New York, NY 10001</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
