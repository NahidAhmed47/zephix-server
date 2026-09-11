import { z } from "zod";
import { PRICING_MODEL } from "./service.enum";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const optionalObjectId = z.union([objectId, z.literal("")]).optional();

export const createServiceCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1, "Category name is required"),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
  }),
});

export const updateServiceCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
  }),
});

const serviceBody = {
  name: z.string().min(1, "Service name is required"),
  code: z.string().optional(),
  description: z.string().optional(),
  category: optionalObjectId,
  price: z.coerce.number().min(0).optional(),
  cost: z.coerce.number().min(0).optional(),
  currency: z.string().optional(),
  pricing_model: z.nativeEnum(PRICING_MODEL).optional(),
  estimated_duration_days: z.coerce.number().min(0).optional(),
  unit: z.string().optional(),
  tax_rate: z.coerce.number().min(0).max(100).optional(),
  is_active: z.boolean().optional(),
  notes: z.string().optional(),
};

export const createServiceSchema = z.object({
  body: z.object(serviceBody),
});

export const updateServiceSchema = z.object({
  body: z.object({
    ...serviceBody,
    name: z.string().min(1).optional(),
  }),
});
