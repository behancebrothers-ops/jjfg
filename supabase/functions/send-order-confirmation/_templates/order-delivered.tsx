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

interface OrderDeliveredEmailProps {
  userName: string;
  orderNumber: string;
  reviewUrl?: string;
  shippingMethod?: string;
}

export const OrderDeliveredEmail = ({
  userName = 'Customer',
  orderNumber = 'ORD-12345',
  reviewUrl = '#',
  shippingMethod = 'Standard Delivery',
}: OrderDeliveredEmailProps) => (
  <Html>
    <Head />
    <Preview>Your order {orderNumber} has been delivered!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={emoji}>✨</Text>
          <Heading style={h1}>Order Delivered!</Heading>
          <Text style={brandName}>Luxurious Store</Text>
        </Section>
        
        <Section style={content}>
          <Text style={text}>Hi {userName}! 🌟</Text>
          <Text style={text}>
            Hooray! 🎊 Your order <strong>{orderNumber}</strong> has been delivered and
            is waiting for you to unwrap! We're doing a happy dance over here! 💃
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightText}>
              🎁 Your fashion treasures are home! Time to shine! ✨
            </Text>
          </Section>

          <Section style={deliveryBox}>
            <Text style={deliveryTitle}>📦 Delivery Complete</Text>
            <Text style={deliveryText}>
              <strong>Shipping Method:</strong> {shippingMethod}
            </Text>
            <Text style={deliveryText}>
              <strong>Status:</strong> Successfully Delivered
            </Text>
          </Section>

          <Text style={text}>
            We're SO excited for you! Now comes the best part - trying on your new pieces
            and feeling absolutely fabulous! 💖
          </Text>

          <Text style={text}>
            Would you make our day by sharing your thoughts? Your feedback lights up our
            world and helps fellow fashion lovers discover their next favorite piece! 🌈
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={reviewUrl}>
              Leave a Review
            </Button>
          </Section>

          <Section style={infoBox}>
            <Heading style={h3}>We're Here For You! 💚</Heading>
            <Text style={infoText}>
              Something not quite right? No worries at all! Reach out to us within 7 days
              and we'll make it perfect. Your happiness is our mission! 😊
            </Text>
          </Section>

          <Section style={thankYouBox}>
            <Text style={thankYouText}>
              From the bottom of our hearts, THANK YOU for choosing Luxurious Store! 💝
              You're not just a customer - you're part of our fashion family. We can't
              wait to style you again soon! Keep being amazing! ✨
            </Text>
          </Section>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            Let's chat anytime! 💬 We're here at support@luxuriousstore.com
          </Text>
          <Text style={footerText}>
            Made with love 💕 © {new Date().getFullYear()} Luxurious Store. All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default OrderDeliveredEmail;

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

const highlightBox = {
  backgroundColor: '#dcfce7',
  border: '3px solid #10b981',
  borderRadius: '12px',
  padding: '25px',
  margin: '25px 0',
};

const highlightText = {
  color: '#065f46',
  fontSize: '20px',
  fontWeight: '700',
  margin: '0',
  textAlign: 'center' as const,
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

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
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
  padding: '14px 40px',
};

const infoBox = {
  backgroundColor: '#e8f4fd',
  borderRadius: '12px',
  padding: '20px',
  margin: '25px 0',
  border: '2px solid #3b82f6',
};

const h3 = {
  color: '#1e40af',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 10px',
};

const infoText = {
  color: '#1e40af',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
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

const thankYouBox = {
  backgroundColor: '#f8f5e6',
  border: '2px solid #d4af37',
  borderRadius: '12px',
  padding: '25px',
  margin: '25px 0',
  textAlign: 'center' as const,
};

const thankYouText = {
  color: '#7c6412',
  fontSize: '15px',
  lineHeight: '26px',
  margin: '0',
  fontStyle: 'italic' as const,
};
