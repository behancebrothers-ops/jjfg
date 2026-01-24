export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName?: string;
}

export interface ProfileFormData {
  full_name: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface ReviewFormData {
  rating: number;
  review_text?: string;
}

export interface CheckoutFormData {
  email: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  save_address?: boolean;
}

export interface ProductFormData {
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  is_featured: boolean;
  is_new_arrival: boolean;
  images: File[];
}

export interface DiscountFormData {
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  minimum_purchase?: number;
  usage_limit?: number;
  valid_from: string;
  valid_until?: string;
  active: boolean;
}
