import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

        <div className="prose prose-slate max-w-none">
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground mb-4">
              This Privacy Policy explains how we collect, use, and protect your personal information when you visit or make a purchase from our website.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <p className="text-muted-foreground mb-4">
              We collect the following types of information:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Personal Information:</strong> such as your name, email address, billing address, and payment details when you make a purchase or contact us.</li>
              <li><strong>Usage Data:</strong> such as your IP address, browser type, pages visited, and time spent on the site.</li>
              <li><strong>Cookies:</strong> small data files used to improve your browsing experience and analyze site performance.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">
              We use the collected information to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Process orders and provide products or services</li>
              <li>Respond to your inquiries and customer support requests</li>
              <li>Improve our website, products, and services</li>
              <li>Send marketing or promotional communications (if you’ve opted in)</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Sharing Your Information</h2>
            <p className="text-muted-foreground mb-4">
              We do not sell your personal information. However, we may share it with trusted third parties who help us operate our business, such as:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Payment processors</li>
              <li>Shipping providers</li>
              <li>Analytics and advertising partners</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              These third parties are required to protect your data and use it only for legitimate business purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
            <p className="text-muted-foreground mb-4">
              We retain your information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p className="text-muted-foreground mb-4">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Access and request a copy of your personal data</li>
              <li>Request correction or deletion of your data</li>
              <li>Withdraw consent for data processing</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Security</h2>
            <p className="text-muted-foreground mb-4">
              We use reasonable technical and organizational measures to protect your personal information against unauthorized access, alteration, or destruction. However, no internet transmission is completely secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Cookies</h2>
            <p className="text-muted-foreground mb-4">
              Our website uses cookies to enhance user experience, analyze site traffic, and personalize content. You can manage your cookie preferences through your browser settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Changes to This Policy</h2>
            <p className="text-muted-foreground mb-4">
              We may update this Privacy Policy periodically. Any changes will be posted on this page with an updated revision date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have any questions or concerns about this Privacy Policy, please contact us through our Contact page.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
