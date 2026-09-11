import { z } from "zod";
import { DEAL_STAGE } from "./deal.enum";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const optionalObjectId = z.union([objectId, z.literal("")]).optional();

export const createDealSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Deal name is required"),
    client: optionalObjectId,
    lead_name: z.string().optional(),
    service: optionalObjectId,
    expected_value: z.coerce.number().min(0).optional(),
    currency: z.string().optional(),
    probability: z.coerce.number().min(0).max(100).optional(),
    expected_close_date: z.string().optional(),
    stage: z.nativeEnum(DEAL_STAGE).optional(),
    owner: optionalObjectId,
    notes: z.string().optional(),
  }),
});

export const updateDealSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    client: optionalObjectId,
    lead_name: z.string().optional(),
    service: optionalObjectId,
    expected_value: z.coerce.number().min(0).optional(),
    currency: z.string().optional(),
    probability: z.coerce.number().min(0).max(100).optional(),
    expected_close_date: z.string().optional(),
    stage: z.nativeEnum(DEAL_STAGE).optional(),
    owner: optionalObjectId,
    notes: z.string().optional(),
  }),
});

export const updateDealStageSchema = z.object({
  body: z.object({
    stage: z.nativeEnum(DEAL_STAGE),
  }),
});
