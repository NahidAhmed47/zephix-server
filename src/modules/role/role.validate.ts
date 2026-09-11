import { z } from "zod";

const scopeEnum = z.enum(["all", "own", "assigned", "team"]);

export const createRoleSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Role name is required"),
    description: z.string().optional(),
    permissions: z.array(z.string()).default([]),
    scopes: z.record(scopeEnum).optional(),
  }),
});

export const updateRoleSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    permissions: z.array(z.string()).optional(),
    scopes: z.record(scopeEnum).optional(),
  }),
});
