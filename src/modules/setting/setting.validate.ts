import { z } from "zod";

export const updateSettingSchema = z.object({
  body: z.object({
    company: z
      .object({
        name: z.string().optional(),
        logo: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        website: z.string().optional(),
      })
      .optional(),
    currency: z.string().optional(),
    finance: z
      .object({
        invoice_prefix: z.string().optional(),
        payment_prefix: z.string().optional(),
        default_payment_terms_days: z.number().optional(),
        payment_methods: z.array(z.string()).optional(),
      })
      .optional(),
    messaging: z
      .object({
        sms_enabled: z.boolean().optional(),
        email_enabled: z.boolean().optional(),
      })
      .optional(),
    communication: z
      .object({
        sms: z
          .object({
            provider: z.string().optional(),
            api_key: z.string().optional(),
            sender_id: z.string().optional(),
            base_url: z.string().optional(),
          })
          .optional(),
        smtp: z
          .object({
            host: z.string().optional(),
            port: z.number().optional(),
            user: z.string().optional(),
            pass: z.string().optional(),
            from_name: z.string().optional(),
            from_email: z.string().optional(),
            secure: z.boolean().optional(),
          })
          .optional(),
      })
      .optional(),
    security: z
      .object({
        session_timeout_minutes: z.number().optional(),
      })
      .optional(),
  }),
});
