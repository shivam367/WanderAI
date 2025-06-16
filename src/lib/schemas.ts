// src/lib/schemas.ts
import { z } from "zod";

export const ItineraryInputSchema = z.object({
  destination: z.string().min(3, "Destination must be at least 3 characters long.").max(100),
  interests: z.string().min(5, "Interests must be at least 5 characters long.").max(500),
  currency: z.enum(["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "INR"], {
    errorMap: () => ({ message: "Please select a valid currency." }),
  }),
  budgetAmount: z.coerce.number().positive("Budget must be a positive number.").max(1000000, "Budget seems too high."),
  duration: z.coerce.number().int().min(1, "Duration must be at least 1 day.").max(90, "Duration cannot exceed 90 days."),
});

export type ItineraryInput = z.infer<typeof ItineraryInputSchema>;


export const RefineItineraryInputSchema = z.object({
  userFeedback: z.string().min(10, "Feedback must be at least 10 characters long.").max(1000, "Feedback is too long."),
});

export type RefineItineraryInput = z.infer<typeof RefineItineraryInputSchema>;


export const LoginFormSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export type LoginFormInput = z.infer<typeof LoginFormSchema>;

export const RegisterFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters."),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"], // Point error to confirmPassword field
});

export type RegisterFormInput = z.infer<typeof RegisterFormSchema>;

export const ProfileEditSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(100),
});

export type ProfileEditInput = z.infer<typeof ProfileEditSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."), // Min 1 as we don't enforce length for old passwords
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmNewPassword: z.string().min(6, "New password must be at least 6 characters."),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match.",
  path: ["confirmNewPassword"],
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
