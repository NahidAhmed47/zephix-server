import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { MessageTemplateService } from "./messageTemplate.service";
import { auditService } from "@/services/audit.service";
import { getPaginationOptions, getStringFilters } from "@/shared/queryOptions";
import { IAuthUser } from "@/lib/rbac";

class Controller extends BaseController {
  create = this.catchAsync(async (req: Request, res: Response) => {
    const tpl = await MessageTemplateService.create(req.body, req.user as IAuthUser);
    await auditService.log({
      req,
      action: "message_template.create",
      module: "communication",
      resource_id: String(tpl?._id),
      after: { name: tpl?.name, type: tpl?.type },
    });
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Template created successfully.",
      data: tpl,
    });
  });

  list = this.catchAsync(async (req: Request, res: Response) => {
    const options = getPaginationOptions(req);
    const filters = getStringFilters(req, ["type", "active", "search"]);
    const result = await MessageTemplateService.list(options, filters);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Templates fetched successfully.",
      data: result,
    });
  });

  getOne = this.catchAsync(async (req: Request, res: Response) => {
    const tpl = await MessageTemplateService.getById(req.params.id);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Template fetched successfully.",
      data: tpl,
    });
  });

  update = this.catchAsync(async (req: Request, res: Response) => {
    const { updated } = await MessageTemplateService.update(
      req.params.id,
      req.body
    );
    await auditService.log({
      req,
      action: "message_template.update",
      module: "communication",
      resource_id: req.params.id,
      after: { name: updated?.name },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Template updated successfully.",
      data: updated,
    });
  });

  remove = this.catchAsync(async (req: Request, res: Response) => {
    const before = await MessageTemplateService.remove(req.params.id);
    await auditService.log({
      req,
      action: "message_template.delete",
      module: "communication",
      resource_id: req.params.id,
      before: { name: before.name },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Template deleted successfully.",
      data: null,
    });
  });
}

export const MessageTemplateController = new Controller();
