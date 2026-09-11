import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { AuditLogService } from "./auditLog.service";
import { getPaginationOptions, getStringFilters } from "@/shared/queryOptions";

class Controller extends BaseController {
  list = this.catchAsync(async (req: Request, res: Response) => {
    const options = getPaginationOptions(req);
    const filters = getStringFilters(req, [
      "actor",
      "module",
      "action",
      "from",
      "to",
    ]);
    const result = await AuditLogService.list(options, filters);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Audit logs fetched successfully.",
      data: result,
    });
  });
}

export const AuditLogController = new Controller();
