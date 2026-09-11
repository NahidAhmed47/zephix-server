import { z } from "zod";
import { RECORD_TYPE, HOSTING_TYPE, HOSTING_STATUS } from "./hosting.enum";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const optionalObjectId = z.union([objectId, z.literal("")]).optional();

const hostingBody = {
  name: z.string().min(1, "Domain / host name is required"),
  type: z.nativeEnum(RECORD_TYPE).optional(),
  project: optionalObjectId,
  registrar: z.string().optional(),
  domain_expiry: z.string().optional(),
  auto_renew: z.boolean().optional(),
  nameservers: z.string().optional(),
  provider: z.string().optional(),
  hosting_type: z.nativeEnum(HOSTING_TYPE).optional(),
  server_location: z.string().optional(),
  server_ip: z.string().optional(),
  control_panel_url: z.string().optional(),
  hosting_expiry: z.string().optional(),
  ssl_expiry: z.string().optional(),
  status: z.nativeEnum(HOSTING_STATUS).optional(),
  credentials: z.string().optional(),
  notes: z.string().optional(),
};

export const createHostingSchema = z.object({
  body: z.object({
    ...hostingBody,
    client: objectId,
  }),
});

export const updateHostingSchema = z.object({
  body: z.object({
    ...hostingBody,
    name: z.string().min(1).optional(),
    client: optionalObjectId,
  }),
});
