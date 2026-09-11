import { z } from "zod";
import { CONTRACT_STATUS } from "./contract.enum";
import { PRICING_MODEL } from "@/modules/service/service.enum";
import { MESSAGING_PREF } from "@/modules/client/client.enum";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const optionalObjectId = z.union([objectId, z.literal("")]).optional();

const messaging = z
  .object({
    sms: z.nativeEnum(MESSAGING_PREF).optional(),
    email: z.nativeEnum(MESSAGING_PREF).optional(),
  })
  .optional();

const serviceLine = z.object({
  service: optionalObjectId,
  name: z.string().min(1, "Line name is required"),
  description: z.string().optional(),
  pricing_model: z.nativeEnum(PRICING_MODEL).optional(),
  price: z.coerce.number().min(0).optional(),
  quantity: z.coerce.number().min(0).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  messaging,
});

const contractBody = {
  name: z.string().min(1, "Contract name is required"),
  status: z.nativeEnum(CONTRACT_STATUS).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  renewal_date: z.string().optional(),
  currency: z.string().optional(),
  payment_terms_days: z.coerce.number().min(0).optional(),
  account_manager: optionalObjectId,
  messaging,
  notes: z.string().optional(),
  services: z.array(serviceLine).optional(),
};

export const createContractSchema = z.object({
  body: z.object({
    ...contractBody,
    client: objectId,
  }),
});

export const updateContractSchema = z.object({
  body: z.object({
    ...contractBody,
    name: z.string().min(1).optional(),
  }),
});

export const renewContractSchema = z.object({
  body: z.object({
    start_date: z.string().optional(),
    end_date: z.string().min(1, "New end date is required"),
    renewal_date: z.string().optional(),
  }),
});
