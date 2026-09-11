import { Request } from "express";
import { AuditLogModel } from "@/modules/auditLog/auditLog.model";
import { IAuthUser } from "@/lib/rbac";

interface LogInput {
  req?: Request;
  actor?: IAuthUser | null;
  action: string;
  module: string;
  resource_id?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  before?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  after?: any;
}

/**
 * Append-only audit trail. Never throws — a logging failure must not break the
 * business operation it records.
 */
class AuditService {
  async log(input: LogInput): Promise<void> {
    try {
      const actor =
        input.actor ?? (input.req?.user as IAuthUser | undefined) ?? null;
      const ip = input.req
        ? String(
            (input.req.headers["x-forwarded-for"] as string) ||
              input.req.ip ||
              ""
          )
        : "";
      const userAgent = input.req
        ? String(input.req.headers["user-agent"] || "")
        : "";

      await AuditLogModel.create({
        actor: actor?.id ?? null,
        actor_name: actor?.name ?? "",
        actor_email: actor?.email ?? "",
        action: input.action,
        module: input.module,
        resource_id: input.resource_id ?? null,
        before: input.before ?? null,
        after: input.after ?? null,
        ip,
        user_agent: userAgent,
      });
    } catch (error) {
      console.error("[audit] failed to write log:", (error as Error).message);
    }
  }
}

export const auditService = new AuditService();
