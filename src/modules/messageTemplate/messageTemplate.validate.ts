import { z } from "zod";
import { COMMUNICATION_TYPE } from "@/modules/communicationLog/communicationLog.enum";

const templateBody = {
  name: z.string().min(1, "Template name is required"),
  type: z.nativeEnum(COMMUNICATION_TYPE).optional(),
  subject: z.string().optional(),
  body: z.string().min(1, "Body is required"),
  is_active: z.boolean().optional(),
};

export const createMessageTemplateSchema = z.object({
  body: z.object(templateBody),
});

export const updateMessageTemplateSchema = z.object({
  body: z.object({
    ...templateBody,
    name: z.string().min(1).optional(),
    body: z.string().min(1).optional(),
  }),
});
