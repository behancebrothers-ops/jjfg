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
} from 'https://esm.sh/@react-email/components@0.0.22';
import * as React from 'https://esm.sh/react@18.3.1';

interface OrderShippedEmailProps {
  userName: string;
  orderNumber: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  shippingMethod?: string;
}

export const OrderShippedEmail = ({
  userName = 'Customer',
  orderNumber = 'ORD-12345',
  trackingNumber,
  trackingUrl,
  estimatedDelivery = '3-7 business days',
  shippingMethod = 'Standard Delivery',
}: OrderShippedEmailProps) => (
  <Html>
    <Head />
    <Preview>Your order {orderNumber} has shipped!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={emoji}>📦</Text>
          <Heading style={h1}>Your Order Has Shipped!</Heading>
          <Text style={brandName}>Luxurious Store</Text>
        </Section>
        
        <Section style={content}>
          <Text style={text}>Hi {userName}! 👋</Text>
          <Text style={text}>
            Woohoo! 🎊 Your order <strong>{orderNumber}</strong> has officially left our cozy
            warehouse and is zooming its way to you! We packed it with extra love and care. ✨
          </Text>
          <Text style={text}>
            Your fashion treasures are traveling to meet you, and we can barely contain our
            excitement! 💖
          </Text>

          <Section style={deliveryBox}>
            <Text style={deliveryTitle}>🚚 Shipping Details</Text>
            <Text style={deliveryText}>
              <strong>Method:</strong> {shippingMethod}
            </Text>
            <Text style={deliveryText}>
              <strong>Estimated Arrival:</strong> {estimatedDelivery}
            </Text>
          </Section>

          {trackingNumber && (
            <Section style={trackingBox}>
              <Text style={trackingLabel}>Tracking Number</Text>
              <Text style={trackingNumberStyle}>{trackingNumber}</Text>
              {trackingUrl && (
                <Button style={button} href={trackingUrl}>
                  Track Your Package
                </Button>
              )}
            </Section>
          )}

          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>Expected Delivery:</strong> {estimatedDelivery}
            </Text>
            <Text style={infoText}>
              <strong>Order Number:</strong> {orderNumber}
            </Text>
          </Section>

          <Section style={excitementBox}>
            <Text style={excitementText}>
              🌟 Keep an eye on your doorstep! We'll send you another happy email the moment
              your package is delivered. The countdown to your fashion upgrade is ON! 🎯
            </Text>
          </Section>

          <Text style={text}>
            Thank you for trusting us with your style journey! We're honored to be your fashion
            partner. Keep shining! ✨
          </Text>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            Need anything? We're just a message away! 💬 support@luxuriousstore.com
          </Text>
          <Text style={footerText}>
            Made with love 💕 © {new Date().getFullYear()} Luxurious Store. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default OrderShippedEmail;

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
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0',
  padding: '0',
};

const brandName = {
  color: '#d4af37',
  fontSize: '14px',
  fontWeight: '600',
  margin: '10px 0 0',
  letterSpacing: '1px',
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

const deliveryBox = {
  backgroundColor: '#e8f4fd',
  borderRadius: '12px',
  padding: '20px',
  margin: '20px 0',
  border: '2px solid #3b82f6',
};

const deliveryTitle = {
  color: '#1e40af',
  fontSize: '16px',
  fontWeight: '700',
  margin: '0 0 10px',
};

const deliveryText = {
  color: '#1e40af',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '5px 0',
};

const trackingBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '25px',
  margin: '25px 0',
  textAlign: 'center' as const,
};

const trackingLabel = {
  color: '#666',
  fontSize: '14px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 10px',
};

const trackingNumberStyle = {
  color: '#d4af37',
  fontSize: '24px',
  fontWeight: '700',
  fontFamily: 'monospace',
  margin: '10px 0 20px',
  wordBreak: 'break-all' as const,
};

const button = {
  backgroundColor: '#d4af37',
  borderRadius: '6px',
  color: '#1a1a2e',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 30px',
  margin: '10px 0',
};

const infoBox = {
  backgroundColor: '#f8f5e6',
  borderRadius: '12px',
  padding: '20px',
  margin: '20px 0',
  border: '2px solid #d4af37',
};

const infoText = {
  color: '#7c6412',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '5px 0',
};

const excitementBox = {
  backgroundColor: '#f8f5e6',
  border: '2px solid #d4af37',
  borderRadius: '12px',
  padding: '20px',
  margin: '25px 0',
  textAlign: 'center' as const,
};

const excitementText = {
  color: '#7c6412',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
  fontWeight: '500',
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
