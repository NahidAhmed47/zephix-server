import { z } from "zod";
import { USER_STATUS } from "./user.interface";

const statusEnum = z.enum([
  USER_STATUS.ACTIVE,
  USER_STATUS.INACTIVE,
  USER_STATUS.SUSPENDED,
]);

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: objectId,
    phone_number: z.string().optional(),
    status: statusEnum.optional(),
    department: z.string().optional(),
    image: z.string().optional(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    role: objectId.optional(),
    phone_number: z.string().optional(),
    status: statusEnum.optional(),
    department: z.string().optional(),
    image: z.string().optional(),
  }),
});
