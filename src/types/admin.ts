export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'user';
}

export interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  minimum_purchase: number | null;
  usage_limit: number | null;
  usage_count: number | null;
  valid_from: string;
  valid_until: string | null;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  description: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobApplication {
  id: string;
  job_posting_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  cover_letter: string | null;
  resume_path: string;
  status: 'pending' | 'reviewed' | 'interviewing' | 'rejected' | 'hired';
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryAdjustment {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  quantity_change: number;
  reason: string;
  notes: string | null;
  admin_user_id: string | null;
  created_at: string | null;
}

export interface BulkEmailRequest {
  subject: string;
  body: string;
  recipientType: 'all' | 'customers' | 'newsletter';
  testMode?: boolean;
}
