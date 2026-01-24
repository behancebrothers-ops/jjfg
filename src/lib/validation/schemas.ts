/**
 * Centralized validation schemas using Zod.
 * All input validation should use these schemas for consistency.
 */

import { z } from 'zod';

// Common validation patterns
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

// Primitive validators
export const uuidSchema = z.string().regex(UUID_REGEX, 'Invalid UUID format');
export const positiveIntSchema = z.number().int().positive('Must be a positive integer');
export const emailSchema = z.string().email('Invalid email address').max(255);
export const phoneSchema = z.string().min(10).max(20).optional();

// Password validation with strength requirements
export const passwordSchema = z.string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(128, 'Password too long')
  .refine(
    (val) => /[a-z]/.test(val),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (val) => /[A-Z]/.test(val),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (val) => /\d/.test(val),
    'Password must contain at least one number'
  )
  .refine(
    (val) => /[@$!%*?&#^()_+=\-[\]{}|;:,.<>]/.test(val),
    'Password must contain at least one special character'
  );

// Simple password for login (no strength check)
export const loginPasswordSchema = z.string()
  .min(1, 'Password is required')
  .max(128, 'Password too long');

// Auth schemas
export const signUpSchema = z.object({
  email: emailSchema.trim().toLowerCase(),
  password: passwordSchema,
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long').trim(),
  phone: z.string().min(10, 'Phone number must be at least 10 characters').max(20, 'Phone number too long').trim(),
});

export const signInSchema = z.object({
  email: emailSchema.trim().toLowerCase(),
  password: loginPasswordSchema,
});

export const adminSignInSchema = z.object({
  email: emailSchema.trim().toLowerCase(),
  password: loginPasswordSchema,
});

// Entity-specific schemas
export const cartItemSchema = z.object({
  productId: uuidSchema,
  variantId: uuidSchema.nullable().optional(),
  quantity: positiveIntSchema.max(99, 'Maximum quantity is 99'),
});

export const addressSchema = z.object({
  fullName: z.string().min(2, 'Name too short').max(100, 'Name too long'),
  addressLine1: z.string().min(5, 'Address too short').max(200, 'Address too long'),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().min(2, 'City too short').max(100, 'City too long'),
  state: z.string().min(2, 'State too short').max(100, 'State too long'),
  postalCode: z.string().min(3, 'Postal code too short').max(20, 'Postal code too long'),
  country: z.string().min(2, 'Country too short').max(100, 'Country too long'),
  phone: phoneSchema,
});

export const contactFormSchema = z.object({
  name: z.string().min(2, 'Name too short').max(100, 'Name too long').trim(),
  email: emailSchema.trim(),
  subject: z.string().min(5, 'Subject too short').max(200, 'Subject too long').trim(),
  message: z.string().min(10, 'Message too short').max(2000, 'Message too long').trim(),
});

export const profileSchema = z.object({
  fullName: z.string().min(2).max(100).optional().nullable(),
  email: emailSchema,
  phone: phoneSchema.nullable(),
  addressLine1: z.string().max(200).optional().nullable(),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
});

export const reviewSchema = z.object({
  productId: uuidSchema,
  rating: z.number().int().min(1, 'Minimum rating is 1').max(5, 'Maximum rating is 5'),
  reviewText: z.string().max(2000, 'Review too long').optional().nullable(),
});

export const newsletterSchema = z.object({
  email: emailSchema,
});

export const discountCodeSchema = z.object({
  code: z.string()
    .min(3, 'Code too short')
    .max(50, 'Code too long')
    .regex(/^[A-Za-z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens, and underscores')
    .transform(val => val.toUpperCase()),
});

// Type exports
export type CartItemInput = z.infer<typeof cartItemSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type ContactFormInput = z.infer<typeof contactFormSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type NewsletterInput = z.infer<typeof newsletterSchema>;
export type DiscountCodeInput = z.infer<typeof discountCodeSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type AdminSignInInput = z.infer<typeof adminSignInSchema>;

// Validation helper
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map(issue => issue.message);
  return { success: false, errors };
}
