import { z } from "zod";
import { COMMUNICATION_TYPE } from "@/modules/communicationLog/communicationLog.enum";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const optionalObjectId = z.union([objectId, z.literal("")]).optional();

export const sendSmsSchema = z.object({
  body: z.object({
    client: optionalObjectId,
    to: z.string().optional(),
    template: optionalObjectId,
    message: z.string().optional(),
    invoice: optionalObjectId,
  }),
});

export const sendEmailSchema = z.object({
  body: z.object({
    client: optionalObjectId,
    to: z.string().optional(),
    template: optionalObjectId,
    subject: z.string().optional(),
    message: z.string().optional(),
    invoice: optionalObjectId,
  }),
});

export const testConnectionSchema = z.object({
  body: z.object({
    type: z.nativeEnum(COMMUNICATION_TYPE),
  }),
});
