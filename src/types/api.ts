export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SupabaseError {
  message: string;
  details: string;
  hint: string;
  code: string;
}

export interface StripeCheckoutResponse {
  url: string;
  sessionId: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  orderNumber?: string;
  orderId?: string;
  error?: string;
  alreadyProcessed?: boolean;
}

export interface RecommendationsResponse {
  recommendations: Array<{
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    category: string;
  }>;
  strategy: string;
  count: number;
}

export interface SearchSuggestion {
  id: string;
  name: string;
  category: string;
  price: number;
}

export interface FileUploadResponse {
  path: string;
  publicUrl: string;
}

export interface RateLimitResponse {
  allowed: boolean;
  remainingAttempts?: number;
  blockedUntil?: string;
  message?: string;
}
