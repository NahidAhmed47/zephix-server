import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const optionalObjectId = z.union([objectId, z.literal("")]).optional();

const ruleBody = {
  name: z.string().min(1, "Rule name is required"),
  offset_days: z.coerce.number().int(),
  sms_enabled: z.boolean().optional(),
  email_enabled: z.boolean().optional(),
  sms_template: optionalObjectId,
  email_template: optionalObjectId,
  is_active: z.boolean().optional(),
};

export const createReminderRuleSchema = z.object({
  body: z.object(ruleBody),
});

export const updateReminderRuleSchema = z.object({
  body: z.object({
    ...ruleBody,
    name: z.string().min(1).optional(),
    offset_days: z.coerce.number().int().optional(),
  }),
});
