import { AuditLogModel } from "./auditLog.model";
import { paginationHelpers } from "@/helpers/paginationHelpers";
import { IPaginationOptions } from "@/interfaces/pagination.interfaces";

class Service {
  async list(
    options: IPaginationOptions,
    filters: {
      actor?: string;
      module?: string;
      action?: string;
      from?: string;
      to?: string;
    }
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      paginationHelpers.calculatePagination({
        ...options,
        sortBy: options.sortBy || "createdAt",
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cond: any = {};
    if (filters.actor) cond.actor = filters.actor;
    if (filters.module) cond.module = filters.module;
    if (filters.action) cond.action = { $regex: filters.action, $options: "i" };
    if (filters.from || filters.to) {
      cond.createdAt = {};
      if (filters.from) cond.createdAt.$gte = new Date(filters.from);
      if (filters.to) cond.createdAt.$lte = new Date(filters.to);
    }

    const [data, total] = await Promise.all([
      AuditLogModel.find(cond)
        .populate("actor", "name email")
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLogModel.countDocuments(cond),
    ]);

    return { meta: { page, limit, total }, data };
  }
}

export const AuditLogService = new Service();
