import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { CommunicationService } from "./communication.service";
import { CommunicationLogService } from "@/modules/communicationLog/communicationLog.service";
import { auditService } from "@/services/audit.service";
import { getPaginationOptions, getStringFilters } from "@/shared/queryOptions";
import { IAuthUser } from "@/lib/rbac";

class Controller extends BaseController {
  sendSms = this.catchAsync(async (req: Request, res: Response) => {
    const { result, log } = await CommunicationService.sendSmsMessage(
      req.body,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "communication.send_sms",
      module: "communication",
      resource_id: String(log?._id),
      after: { recipient: log?.recipient, status: log?.status },
    });
    this.sendResponse(res, {
      statusCode: result.success ? 200 : 502,
      success: result.success,
      message: result.success ? "SMS sent." : `SMS failed: ${result.error}`,
      data: log,
    });
  });

  sendEmail = this.catchAsync(async (req: Request, res: Response) => {
    const { result, log } = await CommunicationService.sendEmailMessage(
      req.body,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "communication.send_email",
      module: "communication",
      resource_id: String(log?._id),
      after: { recipient: log?.recipient, status: log?.status },
    });
    this.sendResponse(res, {
      statusCode: result.success ? 200 : 502,
      success: result.success,
      message: result.success ? "Email sent." : `Email failed: ${result.error}`,
      data: log,
    });
  });

  logs = this.catchAsync(async (req: Request, res: Response) => {
    const options = getPaginationOptions(req);
    const filters = getStringFilters(req, [
      "client",
      "invoice",
      "type",
      "status",
      "search",
    ]);
    const result = await CommunicationLogService.list(options, filters);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Communication logs fetched successfully.",
      data: result,
    });
  });

  balance = this.catchAsync(async (_req: Request, res: Response) => {
    const result = await CommunicationService.balance();
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "SMS balance fetched.",
      data: result,
    });
  });

  test = this.catchAsync(async (req: Request, res: Response) => {
    const result = await CommunicationService.testConnection(req.body.type);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Connection test completed.",
      data: result,
    });
  });
}

export const CommunicationController = new Controller();
