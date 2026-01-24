import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Button,
  Hr,
} from 'https://esm.sh/@react-email/components@0.0.22';
import * as React from 'https://esm.sh/react@18.3.1';

interface WelcomeEmailProps {
  userName: string;
  userEmail: string;
  shopUrl?: string;
}

export const WelcomeEmail = ({
  userName = 'Customer',
  userEmail,
  shopUrl = 'https://luxurious-store.vercel.app/products',
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to Luxurious Store - Your fashion journey begins!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={emoji}>👋</Text>
          <Heading style={h1}>Welcome to Luxurious Store!</Heading>
        </Section>
        
        <Section style={content}>
          <Text style={text}>Hi {userName}! 🤗</Text>
          <Text style={text}>
            Welcome to the Luxurious Store family! We're absolutely over the moon to have
            you here! 🌟 Get ready for a fashion journey filled with style, comfort, and
            lots of joy!
          </Text>

          <Section style={highlightBox}>
            <Heading style={h2}>Your Fashion Adventure Starts Now! 🎊</Heading>
            <Text style={highlightText}>
              🛍️ Explore gorgeous collections curated just for you
              <br />
              💰 Shop worry-free with Cash on Delivery
              <br />
              🚚 Choose between Standard (7 days) or Express (3 days) delivery
              <br />
              ⭐ Access exclusive member-only surprises
              <br />
              💝 Feel amazing in every piece you wear
            </Text>
          </Section>

          <Section style={deliveryInfoBox}>
            <Heading style={h3}>🚚 Delivery Options</Heading>
            <Text style={deliveryText}>
              <strong>Standard Delivery:</strong> 5-7 business days - $5.99
            </Text>
            <Text style={deliveryText}>
              <strong>Express Delivery:</strong> 2-3 business days - $14.99
            </Text>
            <Text style={deliveryText}>
              FREE shipping on orders over $100! 🎉
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={shopUrl}>
              Start Shopping
            </Button>
          </Section>

          <Hr style={hr} />

          <Section style={tipsBox}>
            <Heading style={h3}>Quick Tips to Get Started! 💡</Heading>
            <Text style={tipText}>
              💖 <strong>Build your wishlist:</strong> Save pieces that catch your eye - 
              they're waiting for you!
            </Text>
            <Text style={tipText}>
              📦 <strong>Track with ease:</strong> Watch your orders come to life in your
              personal dashboard
            </Text>
            <Text style={tipText}>
              🔒 <strong>Shop safely:</strong> Your info is protected like treasure - we've
              got you covered!
            </Text>
            <Text style={tipText}>
              ✨ <strong>Stay inspired:</strong> Check back often for fresh arrivals and
              styling ideas
            </Text>
          </Section>

          <Text style={text}>
            Got questions? Feeling curious? We're all ears! 👂 Drop us a line at
            support@luxuriousstore.com - we LOVE chatting with you!
          </Text>

          <Text style={greetingText}>
            Here's to looking fabulous! 🎉
            <br />
            With love & style,
            <br />
            Your Friends at Luxurious Store 💕
          </Text>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            You're receiving this warm welcome because you joined our family at Luxurious
            Store using {userEmail} 💌
          </Text>
          <Text style={footerText}>
            Made with love 💕 © {new Date().getFullYear()} Luxurious Store. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default WelcomeEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
  borderRadius: '12px',
};

const header = {
  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  padding: '40px 30px',
  textAlign: 'center' as const,
  borderRadius: '12px 12px 0 0',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const emoji = {
  fontSize: '48px',
  margin: '0 0 10px',
};

const h1 = {
  color: '#d4af37',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0',
  padding: '0',
};

const content = {
  padding: '30px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '15px 0',
};

const h2 = {
  color: '#7c6412',
  fontSize: '22px',
  fontWeight: '700',
  margin: '0 0 15px',
  textAlign: 'center' as const,
};

const h3 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 15px',
};

const highlightBox = {
  backgroundColor: '#f8f5e6',
  border: '3px solid #d4af37',
  borderRadius: '12px',
  padding: '25px',
  margin: '25px 0',
  textAlign: 'center' as const,
};

const highlightText = {
  color: '#7c6412',
  fontSize: '16px',
  lineHeight: '28px',
  margin: '0',
  textAlign: 'left' as const,
  fontWeight: '500',
};

const deliveryInfoBox = {
  backgroundColor: '#e8f4fd',
  border: '2px solid #3b82f6',
  borderRadius: '12px',
  padding: '25px',
  margin: '25px 0',
};

const deliveryText = {
  color: '#1e40af',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  backgroundColor: '#d4af37',
  borderRadius: '8px',
  color: '#1a1a2e',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 50px',
  boxShadow: '0 4px 6px rgba(212, 175, 55, 0.3)',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '30px 0',
};

const tipsBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '12px',
  padding: '25px',
  margin: '20px 0',
  border: '2px solid #e6ebf1',
};

const tipText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
};

const greetingText = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '25px 0 15px',
  fontStyle: 'italic' as const,
};

const footer = {
  borderTop: '1px solid #e6ebf1',
  padding: '20px 30px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '5px 0',
};
