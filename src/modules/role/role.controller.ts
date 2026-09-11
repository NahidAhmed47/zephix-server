import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { RoleService } from "./role.service";
import { auditService } from "@/services/audit.service";

class Controller extends BaseController {
  create = this.catchAsync(async (req: Request, res: Response) => {
    const role = await RoleService.create(req.body);
    await auditService.log({
      req,
      action: "role.create",
      module: "roles",
      resource_id: String(role?._id),
      after: { name: role?.name, permissions: role?.permissions },
    });
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Role created successfully.",
      data: role,
    });
  });

  list = this.catchAsync(async (_req: Request, res: Response) => {
    const roles = await RoleService.list();
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Roles fetched successfully.",
      data: roles,
    });
  });

  getOne = this.catchAsync(async (req: Request, res: Response) => {
    const role = await RoleService.getById(req.params.id);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Role fetched successfully.",
      data: role,
    });
  });

  update = this.catchAsync(async (req: Request, res: Response) => {
    const { updated, before } = await RoleService.update(req.params.id, req.body);
    await auditService.log({
      req,
      action: "role.update",
      module: "roles",
      resource_id: req.params.id,
      before: { name: before.name, permissions: before.permissions, scopes: before.scopes },
      after: { name: updated?.name, permissions: updated?.permissions, scopes: updated?.scopes },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Role updated successfully.",
      data: updated,
    });
  });

  remove = this.catchAsync(async (req: Request, res: Response) => {
    const role = await RoleService.remove(req.params.id);
    await auditService.log({
      req,
      action: "role.delete",
      module: "roles",
      resource_id: req.params.id,
      before: { name: role.name },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Role deleted successfully.",
      data: null,
    });
  });
}

export const RoleController = new Controller();
