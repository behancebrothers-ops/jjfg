export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  subtotal: number | null;
  shipping_cost: number | null;
  tax_amount: number | null;
  discount_amount: number | null;
  discount_code_id: string | null;
  shipping_method_id: string | null;
  shipping_address_line1: string;
  shipping_address_line2: string | null;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  tracking_number: string | null;
  notes: string | null;
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
  size: string | null;
  color: string | null;
  created_at: string;
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export interface ReturnRequest {
  id: string;
  order_id: string;
  user_id: string;
  status: ReturnStatus;
  reason: string;
  refund_amount: number | null;
  admin_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
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
