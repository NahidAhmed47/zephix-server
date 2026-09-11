import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { ClientService } from "./client.service";
import { auditService } from "@/services/audit.service";
import { getPaginationOptions, getStringFilters } from "@/shared/queryOptions";
import { IAuthUser } from "@/lib/rbac";

class Controller extends BaseController {
  create = this.catchAsync(async (req: Request, res: Response) => {
    const client = await ClientService.create(req.body, req.user as IAuthUser);
    await auditService.log({
      req,
      action: "client.create",
      module: "clients",
      resource_id: String(client?._id),
      after: { name: client?.name },
    });
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Client created successfully.",
      data: client,
    });
  });

  list = this.catchAsync(async (req: Request, res: Response) => {
    const options = getPaginationOptions(req);
    const filters = getStringFilters(req, [
      "status",
      "type",
      "source",
      "account_manager",
      "search",
    ]);
    const result = await ClientService.list(options, filters, req.user as IAuthUser);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Clients fetched successfully.",
      data: result,
    });
  });

  getOne = this.catchAsync(async (req: Request, res: Response) => {
    const client = await ClientService.getById(req.params.id, req.user as IAuthUser);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Client fetched successfully.",
      data: client,
    });
  });

  summary = this.catchAsync(async (req: Request, res: Response) => {
    const summary = await ClientService.summary(req.params.id, req.user as IAuthUser);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Client summary fetched successfully.",
      data: summary,
    });
  });

  update = this.catchAsync(async (req: Request, res: Response) => {
    const { updated, before } = await ClientService.update(
      req.params.id,
      req.body,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "client.update",
      module: "clients",
      resource_id: req.params.id,
      before: { name: before.name, status: before.status },
      after: { name: updated?.name, status: updated?.status },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Client updated successfully.",
      data: updated,
    });
  });

  remove = this.catchAsync(async (req: Request, res: Response) => {
    const before = await ClientService.remove(req.params.id, req.user as IAuthUser);
    await auditService.log({
      req,
      action: "client.delete",
      module: "clients",
      resource_id: req.params.id,
      before: { name: before.name },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Client deleted successfully.",
      data: null,
    });
  });
}

export const ClientController = new Controller();
