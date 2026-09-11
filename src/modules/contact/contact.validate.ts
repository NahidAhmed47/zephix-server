import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const optionalEmail = z
  .union([z.string().email("Invalid email"), z.literal("")])
  .optional();

export const createContactSchema = z.object({
  body: z.object({
    client: objectId,
    name: z.string().min(1, "Contact name is required"),
    designation: z.string().optional(),
    email: optionalEmail,
    phone: z.string().optional(),
    whatsapp: z.string().optional(),
    is_primary: z.boolean().optional(),
    is_billing: z.boolean().optional(),
    is_project: z.boolean().optional(),
    status: z.enum(["active", "inactive"]).optional(),
    notes: z.string().optional(),
  }),
});

export const updateContactSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    designation: z.string().optional(),
    email: optionalEmail,
    phone: z.string().optional(),
    whatsapp: z.string().optional(),
    is_primary: z.boolean().optional(),
    is_billing: z.boolean().optional(),
    is_project: z.boolean().optional(),
    status: z.enum(["active", "inactive"]).optional(),
    notes: z.string().optional(),
  }),
});
