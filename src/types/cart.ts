import { Product, ProductVariant } from './product';

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface CartItemWithProduct extends CartItem {
  product: Product;
  variant?: ProductVariant | ProductVariant[] | null;
}

export interface CartItemDisplay {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
  };
  variant?: {
    id: string;
    size: string;
    color: string;
    price_adjustment: number;
  } | null;
}

export interface AddToCartParams {
  productId: string;
  variantId?: string;
  quantity?: number;
}

export interface UpdateCartParams {
  itemId: string;
  quantity: number;
}
