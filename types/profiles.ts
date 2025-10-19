import { z } from 'zod';

// Define the learning reason enum
export const LearningReasonEnum = z.enum([
  'certificate',
  'job',
  'school',
  'heritage',
  'pure_interest',
  'other'
]);

// Export the type for TypeScript usage
export type LearningReason = z.infer<typeof LearningReasonEnum>;

// Define the profile schema
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().nullable(),
  price_id: z.string().nullable(),
  email: z.string().email().nullable(),
  name: z.string().nullable(),
  updated_at: z.string().datetime().nullable(),
  
  // Language learning specific fields
  native_language: z.string().nullable(),
  learning_language: z.string().nullable(),
  learning_reason: LearningReasonEnum.nullable(),
  proficiency_level: z.enum(['beginner', 'intermediate', 'advanced']).nullable(),
  learning_goals: z.string().nullable(),
  email_notifications: z.enum(['daily', 'weekly', 'none']).default('weekly'),

  // Onboarding completion flag
  onboarding_complete: z.boolean().default(false),

  // Credits system
  credits: z.number().int().min(0).default(1000),
  has_access: z.boolean().nullable(),

  // Avatar system
  avatar_animal: z.string().nullable(),
  avatar_color: z.string().nullable(),
});

// Export the type for TypeScript usage
export type Profile = z.infer<typeof ProfileSchema>;
