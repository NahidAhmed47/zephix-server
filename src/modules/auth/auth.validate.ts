import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    email: z.string({ required_error: "Email is required" }).email("Invalid email"),
    password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    old_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(6, "New password must be at least 6 characters"),
  }),
});

export const refreshSchema = z.object({
  body: z
    .object({ refresh_token: z.string().optional() })
    .optional(),
});
