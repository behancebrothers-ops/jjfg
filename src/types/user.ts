export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface User2FASettings {
  id: string;
  user_id: string;
  email: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface User2FACode {
  id: string;
  user_id: string;
  code: string;
  expires_at: string;
  verified: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  order_confirmation: boolean;
  order_shipped: boolean;
  order_delivered: boolean;
  marketing_emails: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  read: boolean | null;
  created_at: string | null;
}

export interface CustomerAddress {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  address_type: string | null;
  is_default: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}
