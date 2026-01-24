/**
 * Application-wide constants
 * Centralized location for all magic numbers and strings
 */

// API Configuration
export const API_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY_MS: 1000,
  MAX_DELAY_MS: 10000,
  TIMEOUT_MS: 30000,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 12,
  MAX_PAGE_SIZE: 100,
  PRODUCTS_PER_PAGE: 12,
  ORDERS_PER_PAGE: 10,
  REVIEWS_PER_PAGE: 5,
} as const;

// Cart
export const CART = {
  MAX_QUANTITY: 99,
  MIN_QUANTITY: 1,
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  GUEST_CART: 'guest-cart',
  RECENTLY_VIEWED: 'recently-viewed',
  SESSION_ID: 'session_id',
  POPUP_SHOWN: 'newsletter-popup-shown',
  THEME: 'theme',
} as const;

// Shipping
export const SHIPPING = {
  FREE_SHIPPING_THRESHOLD: 100,
  DEFAULT_SHIPPING_COST: 5.99,
  EXPRESS_SHIPPING_COST: 14.99,
} as const;

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

// Return Status
export const RETURN_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
} as const;

// Review
export const REVIEW = {
  MIN_RATING: 1,
  MAX_RATING: 5,
  MAX_TEXT_LENGTH: 2000,
} as const;

// Contact Form
export const CONTACT_FORM = {
  MAX_NAME_LENGTH: 100,
  MAX_SUBJECT_LENGTH: 200,
  MAX_MESSAGE_LENGTH: 2000,
} as const;

// Password Requirements
export const PASSWORD = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: false,
} as const;

// Rate Limiting (client-side debounce)
export const RATE_LIMIT = {
  SEARCH_DEBOUNCE_MS: 300,
  FORM_SUBMIT_DEBOUNCE_MS: 1000,
  BUTTON_CLICK_DEBOUNCE_MS: 500,
} as const;

// Image Upload
export const IMAGE_UPLOAD = {
  MAX_SIZE_MB: 5,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  MAX_DIMENSIONS: { width: 4096, height: 4096 },
} as const;

// Type exports
export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];
export type ReturnStatus = typeof RETURN_STATUS[keyof typeof RETURN_STATUS];
