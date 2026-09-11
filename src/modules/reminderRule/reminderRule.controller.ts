import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { ReminderRuleService } from "./reminderRule.service";
import { auditService } from "@/services/audit.service";
import { getPaginationOptions, getStringFilters } from "@/shared/queryOptions";
import { IAuthUser } from "@/lib/rbac";

class Controller extends BaseController {
  create = this.catchAsync(async (req: Request, res: Response) => {
    const rule = await ReminderRuleService.create(req.body, req.user as IAuthUser);
    await auditService.log({
      req,
      action: "reminder_rule.create",
      module: "communication",
      resource_id: String(rule?._id),
      after: { name: rule?.name, offset_days: rule?.offset_days },
    });
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Reminder rule created successfully.",
      data: rule,
    });
  });

  list = this.catchAsync(async (req: Request, res: Response) => {
    const options = getPaginationOptions(req);
    const filters = getStringFilters(req, ["active"]);
    const result = await ReminderRuleService.list(options, filters);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Reminder rules fetched successfully.",
      data: result,
    });
  });

  getOne = this.catchAsync(async (req: Request, res: Response) => {
    const rule = await ReminderRuleService.getById(req.params.id);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Reminder rule fetched successfully.",
      data: rule,
    });
  });

  update = this.catchAsync(async (req: Request, res: Response) => {
    const { updated } = await ReminderRuleService.update(req.params.id, req.body);
    await auditService.log({
      req,
      action: "reminder_rule.update",
      module: "communication",
      resource_id: req.params.id,
      after: { name: updated?.name },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Reminder rule updated successfully.",
      data: updated,
    });
  });

  remove = this.catchAsync(async (req: Request, res: Response) => {
    const before = await ReminderRuleService.remove(req.params.id);
    await auditService.log({
      req,
      action: "reminder_rule.delete",
      module: "communication",
      resource_id: req.params.id,
      before: { name: before.name },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Reminder rule deleted successfully.",
      data: null,
    });
  });
}

export const ReminderRuleController = new Controller();
