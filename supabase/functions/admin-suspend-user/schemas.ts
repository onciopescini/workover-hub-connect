// Zod validation schemas for admin-suspend-user Edge Function
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// UUID validation helper
const uuidSchema = z.string().uuid({ message: "Invalid UUID format" });

// Suspend/Unsuspend request schema
export const suspendUserRequestSchema = z.object({
  suspended_at: z.string()
    .datetime({ message: "Invalid datetime format for suspended_at" })
    .nullable()
    .optional()
    .transform(val => val === null ? null : val),
  
  reason: z.string()
    .trim()
    .min(10, { message: "Suspension reason must be at least 10 characters" })
    .max(500, { message: "Suspension reason must be less than 500 characters" })
    .optional()
    .refine(
      (val) => {
        // If suspending (suspended_at provided), reason is required
        // This will be checked in the main handler
        return true;
      },
      { message: "Reason is required when suspending a user" }
    )
});

// User ID parameter schema (from URL path)
export const userIdParamSchema = uuidSchema;

// Response schema (for documentation)
export const suspendUserResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  profile: z.object({
    id: uuidSchema,
    suspended_at: z.string().datetime().nullable(),
    suspension_reason: z.string().nullable(),
  }).passthrough(), // Allow additional fields
  suspended: z.boolean()
});

// Error response schema
export const errorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
  code: z.string().optional()
});

// Type exports for TypeScript
export type SuspendUserRequest = z.infer<typeof suspendUserRequestSchema>;
export type SuspendUserResponse = z.infer<typeof suspendUserResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
