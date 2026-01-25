export interface Order {
  id: string;
  user_id: string | null;
  order_number: string;
  status: string;
  total: number;
  subtotal: number;
  shipping: number | null;
  tax: number | null;
  discount: number | null;
  email: string;
  shipping_address: unknown | null;
  billing_address: unknown | null;
  tracking_number: string | null;
  notes: string | null;
  payment_method: string | null;
  payment_status: string | null;
  stripe_session_id: string | null;
  created_at: string;
  updated_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
}

export type OrderStatus = 
  | 'pending' 
  | 'paid' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled' 
  | 'refunded';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
  size: string | null;
  color: string | null;
  product_image: string | null;
  created_at: string;
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export interface ReturnRequest {
  id: string;
  order_id: string;
  user_id: string | null;
  status: string | null;
  reason: string;
  refund_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ReturnStatus = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'completed';

export interface ReturnItem {
  id: string;
  return_request_id: string;
  order_item_id: string;
  quantity: number;
  created_at: string | null;
}