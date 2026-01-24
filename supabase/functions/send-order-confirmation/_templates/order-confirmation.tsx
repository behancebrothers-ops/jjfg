import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Row,
  Column,
  Link,
} from 'https://esm.sh/@react-email/components@0.0.22';
import * as React from 'https://esm.sh/react@18.3.1';

interface OrderItem {
  product_name: string;
  quantity: number;
  price: number;
}

interface OrderConfirmationEmailProps {
  userName: string;
  orderNumber: string;
  orderDate: string;
  status: string;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  taxAmount: number;
  totalAmount: number;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  shippingMethod?: {
    name: string;
    estimatedDays: string;
  };
  appUrl?: string;
}

export const OrderConfirmationEmail = ({
  userName = 'Customer',
  orderNumber = 'ORD-12345',
  orderDate = new Date().toLocaleDateString(),
  status = 'pending',
  items = [],
  subtotal = 0,
  discountAmount = 0,
  shippingCost = 0,
  taxAmount = 0,
  totalAmount = 0,
  shippingAddress = {
    line1: '123 Main St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
  },
  shippingMethod = {
    name: 'Standard Delivery',
    estimatedDays: '5-7 business days',
  },
  appUrl = 'https://luxurious-store.vercel.app',
}: OrderConfirmationEmailProps) => (
  <Html>
    <Head />
    <Preview>Your order {orderNumber} has been confirmed!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={emoji}>🎉</Text>
          <Heading style={h1}>Luxurious Store</Heading>
          <Text style={headerSubtext}>Fashion that makes you feel amazing</Text>
        </Section>
        
        <Section style={content}>
          <Heading style={h2}>Yay! Your Order is Confirmed! 💖</Heading>
          <Text style={text}>Hi {userName}! 👋</Text>
          <Text style={text}>
            We're absolutely thrilled to prepare your new fashion treasures! Your order has been
            lovingly received and our team is already getting it ready with extra care. ✨
          </Text>
          <Text style={text}>
            Here's everything you need to know about your fabulous order:
          </Text>

          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>Order Number:</strong> {orderNumber}
            </Text>
            <Text style={infoText}>
              <strong>Order Date:</strong> {orderDate}
            </Text>
            <Text style={infoText}>
              <strong>Status:</strong>{' '}
              <span style={statusBadge}>{status.toUpperCase()}</span>
            </Text>
            <Text style={infoText}>
              <strong>Payment:</strong> Cash on Delivery
            </Text>
          </Section>

          <Section style={deliveryBox}>
            <Text style={deliveryTitle}>🚚 Delivery Information</Text>
            <Text style={deliveryText}>
              <strong>Method:</strong> {shippingMethod.name}
            </Text>
            <Text style={deliveryText}>
              <strong>Estimated Delivery:</strong> {shippingMethod.estimatedDays}
            </Text>
          </Section>

          <Heading style={h3}>Order Items</Heading>
          <Section style={tableSection}>
            {items.map((item, index) => (
              <Row key={index} style={tableRow}>
                <Column style={tableCell}>
                  <Text style={tableCellText}>{item.product_name}</Text>
                </Column>
                <Column style={tableCellCenter}>
                  <Text style={tableCellText}>x{item.quantity}</Text>
                </Column>
                <Column style={tableCellRight}>
                  <Text style={tableCellText}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Hr style={hr} />

          <Section style={totalsSection}>
            <Row style={totalRow}>
              <Column>
                <Text style={totalLabel}>Subtotal:</Text>
              </Column>
              <Column>
                <Text style={totalValue}>${subtotal.toFixed(2)}</Text>
              </Column>
            </Row>
            {discountAmount > 0 && (
              <Row style={totalRow}>
                <Column>
                  <Text style={{...totalLabel, color: '#10b981'}}>Discount:</Text>
                </Column>
                <Column>
                  <Text style={{...totalValue, color: '#10b981'}}>
                    -${discountAmount.toFixed(2)}
                  </Text>
                </Column>
              </Row>
            )}
            <Row style={totalRow}>
              <Column>
                <Text style={totalLabel}>Shipping ({shippingMethod.name}):</Text>
              </Column>
              <Column>
                <Text style={totalValue}>${shippingCost.toFixed(2)}</Text>
              </Column>
            </Row>
            <Row style={totalRow}>
              <Column>
                <Text style={totalLabel}>Tax:</Text>
              </Column>
              <Column>
                <Text style={totalValue}>${taxAmount.toFixed(2)}</Text>
              </Column>
            </Row>
            <Hr style={hr} />
            <Row style={totalRow}>
              <Column>
                <Text style={grandTotalLabel}>Total:</Text>
              </Column>
              <Column>
                <Text style={grandTotalValue}>${totalAmount.toFixed(2)}</Text>
              </Column>
            </Row>
          </Section>

          <Heading style={h3}>Shipping Address</Heading>
          <Section style={addressBox}>
            <Text style={addressText}>{shippingAddress.line1}</Text>
            {shippingAddress.line2 && (
              <Text style={addressText}>{shippingAddress.line2}</Text>
            )}
            <Text style={addressText}>
              {shippingAddress.city}, {shippingAddress.state}{' '}
              {shippingAddress.postalCode}
            </Text>
            <Text style={addressText}>{shippingAddress.country}</Text>
          </Section>

          <Section style={codNotice}>
            <Text style={codText}>
              💰 <strong>Cozy Cash on Delivery:</strong> No worries about online payments! 
              Just keep ${totalAmount.toFixed(2)} ready when your package arrives. Our friendly
              delivery partner will collect it with a smile! 😊
            </Text>
          </Section>

          <Section style={messageBox}>
            <Text style={messageText}>
              We're so excited for you to receive your new items! We've carefully selected each
              piece and can't wait to see how amazing you'll look. Thank you for choosing us to
              be part of your style journey! 💝
            </Text>
          </Section>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            Have questions? We're here for you! 💬 Reach out at support@luxuriousstore.com
          </Text>
          <Text style={footerText}>
            Made with love 💕 © {new Date().getFullYear()} Luxurious Store. All rights reserved.
          </Text>
          <Text style={footerText}>
            <Link href={`${appUrl}/unsubscribe`} style={unsubscribeLink}>
              Unsubscribe from marketing emails
            </Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default OrderConfirmationEmail;

// Styles
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
};

const emoji = {
  fontSize: '48px',
  margin: '0 0 10px',
};

const header = {
  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  padding: '40px 30px',
  textAlign: 'center' as const,
  borderRadius: '12px 12px 0 0',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const headerSubtext = {
  color: '#d4af37',
  fontSize: '14px',
  fontWeight: '400',
  margin: '10px 0 0',
  opacity: 0.9,
};

const h1 = {
  color: '#d4af37',
  fontSize: '32px',
  fontWeight: '700',
  margin: '10px 0 0',
  padding: '0',
};

const content = {
  padding: '30px',
};

const h2 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 20px',
};

const h3 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: '600',
  margin: '30px 0 15px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
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
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '5px 0',
};

const statusBadge = {
  color: '#d4af37',
  fontWeight: '700',
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

const tableSection = {
  margin: '15px 0',
};

const tableRow = {
  borderBottom: '1px solid #eee',
};

const tableCell = {
  padding: '12px 8px',
};

const tableCellCenter = {
  padding: '12px 8px',
  textAlign: 'center' as const,
};

const tableCellRight = {
  padding: '12px 8px',
  textAlign: 'right' as const,
};

const tableCellText = {
  margin: '0',
  fontSize: '14px',
  color: '#333',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const totalsSection = {
  margin: '20px 0',
};

const totalRow = {
  marginBottom: '8px',
};

const totalLabel = {
  fontSize: '14px',
  color: '#666',
  margin: '0',
};

const totalValue = {
  fontSize: '14px',
  color: '#333',
  textAlign: 'right' as const,
  margin: '0',
};

const grandTotalLabel = {
  fontSize: '18px',
  fontWeight: '700',
  color: '#333',
  margin: '0',
};

const grandTotalValue = {
  fontSize: '18px',
  fontWeight: '700',
  color: '#d4af37',
  textAlign: 'right' as const,
  margin: '0',
};

const addressBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '15px',
  margin: '15px 0',
};

const addressText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '5px 0',
};

const codNotice = {
  backgroundColor: '#dcfce7',
  border: '2px solid #10b981',
  borderRadius: '12px',
  padding: '20px',
  margin: '25px 0',
};

const codText = {
  color: '#065f46',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
};

const messageBox = {
  backgroundColor: '#f8f5e6',
  border: '2px solid #d4af37',
  borderRadius: '12px',
  padding: '20px',
  margin: '25px 0',
  textAlign: 'center' as const,
};

const messageText = {
  color: '#7c6412',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
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

const unsubscribeLink = {
  color: '#d4af37',
  textDecoration: 'underline',
  fontSize: '11px',
};
