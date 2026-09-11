import { z } from "zod";
import { PROJECT_STATUS, PROJECT_PRIORITY } from "./project.enum";
import { MESSAGING_PREF } from "@/modules/client/client.enum";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const optionalObjectId = z.union([objectId, z.literal("")]).optional();

const messaging = z
  .object({
    sms: z.nativeEnum(MESSAGING_PREF).optional(),
    email: z.nativeEnum(MESSAGING_PREF).optional(),
  })
  .optional();

const projectBody = {
  name: z.string().min(1, "Project name is required"),
  contract: optionalObjectId,
  services: z.array(objectId).optional(),
  project_manager: optionalObjectId,
  team: z.array(objectId).optional(),
  start_date: z.string().optional(),
  deadline: z.string().optional(),
  status: z.nativeEnum(PROJECT_STATUS).optional(),
  priority: z.nativeEnum(PROJECT_PRIORITY).optional(),
  budget: z.coerce.number().min(0).optional(),
  currency: z.string().optional(),
  messaging,
  notes: z.string().optional(),
};

export const createProjectSchema = z.object({
  body: z.object({
    ...projectBody,
    client: objectId,
  }),
});

export const updateProjectSchema = z.object({
  body: z.object({
    ...projectBody,
    name: z.string().min(1).optional(),
    client: optionalObjectId,
  }),
});
