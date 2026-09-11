import { z } from "zod";
import {
  CLIENT_STATUS,
  CLIENT_TYPE,
  CLIENT_SOURCE,
  MESSAGING_PREF,
} from "./client.enum";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const optionalObjectId = z.union([objectId, z.literal("")]).optional();
const optionalEmail = z
  .union([z.string().email("Invalid email"), z.literal("")])
  .optional();

const address = z
  .object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    district: z.string().optional(),
    country: z.string().optional(),
    zip_code: z.string().optional(),
  })
  .optional();

const messaging = z
  .object({
    sms: z.nativeEnum(MESSAGING_PREF).optional(),
    email: z.nativeEnum(MESSAGING_PREF).optional(),
  })
  .optional();

const social = z
  .object({
    facebook: z.string().optional(),
    linkedin: z.string().optional(),
    twitter: z.string().optional(),
  })
  .optional();

export const createClientSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Client name is required"),
    type: z.nativeEnum(CLIENT_TYPE).optional(),
    industry: z.string().optional(),
    email: optionalEmail,
    phone: z.string().optional(),
    website: z.string().optional(),
    address,
    social,
    source: z.nativeEnum(CLIENT_SOURCE).optional(),
    account_manager: optionalObjectId,
    status: z.nativeEnum(CLIENT_STATUS).optional(),
    messaging,
    notes: z.string().optional(),
  }),
});

export const updateClientSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    type: z.nativeEnum(CLIENT_TYPE).optional(),
    industry: z.string().optional(),
    email: optionalEmail,
    phone: z.string().optional(),
    website: z.string().optional(),
    address,
    social,
    source: z.nativeEnum(CLIENT_SOURCE).optional(),
    account_manager: optionalObjectId,
    status: z.nativeEnum(CLIENT_STATUS).optional(),
    messaging,
    notes: z.string().optional(),
  }),
});
