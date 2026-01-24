// Product types
export type {
  Product,
  ProductVariant,
  ProductImage,
  ProductWithImages,
  ProductWithVariants,
  ProductFull,
  Review,
  ProductView,
} from './product';

// Cart types
export type {
  CartItem,
  CartItemWithProduct,
  CartItemDisplay,
  AddToCartParams,
  UpdateCartParams,
} from './cart';

// Order types
export type {
  Order,
  OrderStatus,
  OrderItem,
  OrderWithItems,
  ReturnRequest,
  ReturnStatus,
  ReturnItem,
} from './order';

// User types
export type {
  Profile,
  UserRole,
  User2FASettings,
  User2FACode,
  NotificationPreferences,
  Notification,
  CustomerAddress,
} from './user';

// Admin types
export type {
  AdminUser,
  DiscountCode,
  EmailTemplate,
  JobPosting,
  JobApplication,
  Category,
  InventoryAdjustment,
  BulkEmailRequest,
} from './admin';

// API types
export type {
  ApiResponse,
  PaginatedResponse,
  SupabaseError,
  StripeCheckoutResponse,
  VerifyPaymentResponse,
  RecommendationsResponse,
  SearchSuggestion,
  FileUploadResponse,
  RateLimitResponse,
} from './api';

// Blog types
export type {
  BlogPost,
  BlogCategory,
} from './blog';

// Form types
export type {
  ContactFormData,
  LoginFormData,
  SignupFormData,
  ProfileFormData,
  ReviewFormData,
  CheckoutFormData,
  ProductFormData,
  DiscountFormData,
} from './form';

// Common utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type ID = string;
export type Timestamp = string;
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export interface JSONObject {
  [key: string]: JSONValue;
}
export type JSONArray = JSONValue[];
