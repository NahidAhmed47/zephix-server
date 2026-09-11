import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { HostingService } from "./hosting.service";
import { auditService } from "@/services/audit.service";
import { getPaginationOptions, getStringFilters } from "@/shared/queryOptions";
import { IAuthUser } from "@/lib/rbac";

class Controller extends BaseController {
  create = this.catchAsync(async (req: Request, res: Response) => {
    const record = await HostingService.create(req.body, req.user as IAuthUser);
    await auditService.log({
      req,
      action: "hosting.create",
      module: "hosting",
      resource_id: String(record?._id),
      after: { name: record?.name, provider: record?.provider },
    });
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Hosting record created successfully.",
      data: record,
    });
  });

  list = this.catchAsync(async (req: Request, res: Response) => {
    const options = getPaginationOptions(req);
    const filters = getStringFilters(req, [
      "client",
      "project",
      "status",
      "search",
    ]);
    const result = await HostingService.list(options, filters, req.user as IAuthUser);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Hosting records fetched successfully.",
      data: result,
    });
  });

  expiring = this.catchAsync(async (req: Request, res: Response) => {
    const days = Number((req.query.days as string) || 30);
    const result = await HostingService.expiring(days, req.user as IAuthUser);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Expiring hosting records fetched successfully.",
      data: result,
    });
  });

  getOne = this.catchAsync(async (req: Request, res: Response) => {
    const record = await HostingService.getById(
      req.params.id,
      req.user as IAuthUser
    );
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Hosting record fetched successfully.",
      data: record,
    });
  });

  reveal = this.catchAsync(async (req: Request, res: Response) => {
    const result = await HostingService.reveal(
      req.params.id,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "hosting.view_credentials",
      module: "hosting",
      resource_id: req.params.id,
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Credentials revealed.",
      data: result,
    });
  });

  update = this.catchAsync(async (req: Request, res: Response) => {
    const { updated, before } = await HostingService.update(
      req.params.id,
      req.body,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "hosting.update",
      module: "hosting",
      resource_id: req.params.id,
      before: { name: before.name, status: before.status },
      after: { name: updated?.name, status: updated?.status },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Hosting record updated successfully.",
      data: updated,
    });
  });

  remove = this.catchAsync(async (req: Request, res: Response) => {
    const before = await HostingService.remove(
      req.params.id,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "hosting.delete",
      module: "hosting",
      resource_id: req.params.id,
      before: { name: before.name },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Hosting record deleted successfully.",
      data: null,
    });
  });
}

export const HostingController = new Controller();
