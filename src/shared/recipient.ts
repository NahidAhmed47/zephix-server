import { ContactModel } from "@/modules/contact/contact.model";
import { ClientModel } from "@/modules/client/client.model";

/**
 * Resolve the best recipient for a client on a channel (spec §60 step 7):
 * prefer the billing contact, then the primary contact, then any contact with
 * the field, finally the client record itself. Returns "" when none is found.
 */
export const resolveRecipient = async (
  clientId: string,
  channel: "sms" | "email"
): Promise<string> => {
  const field: "phone" | "email" = channel === "sms" ? "phone" : "email";
  const contacts = await ContactModel.find({
    client: clientId,
    is_Deleted: false,
  })
    .select("phone email is_billing is_primary")
    .lean();

  const withField = (c: { phone?: string; email?: string }) => c[field];
  const pick =
    contacts.find((c) => c.is_billing && withField(c)) ||
    contacts.find((c) => c.is_primary && withField(c)) ||
    contacts.find((c) => withField(c));
  if (pick && withField(pick)) return withField(pick) as string;

  const client = await ClientModel.findById(clientId).select("phone email").lean();
  return ((client?.[field] as string) || "").trim();
};
