import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { UserService } from "./user.service";
import { auditService } from "@/services/audit.service";
import { getPaginationOptions, getStringFilters } from "@/shared/queryOptions";
import { IAuthUser } from "@/lib/rbac";

class Controller extends BaseController {
  create = this.catchAsync(async (req: Request, res: Response) => {
    const user = await UserService.create(req.body);
    await auditService.log({
      req,
      action: "user.create",
      module: "users",
      resource_id: String(user?._id),
      after: { name: user?.name, email: user?.email },
    });
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "User created successfully.",
      data: user,
    });
  });

  list = this.catchAsync(async (req: Request, res: Response) => {
    const options = getPaginationOptions(req);
    const filters = getStringFilters(req, ["search", "role", "status"]);
    const result = await UserService.list(options, filters);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Users fetched successfully.",
      data: result,
    });
  });

  getOne = this.catchAsync(async (req: Request, res: Response) => {
    const user = await UserService.getById(req.params.id);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "User fetched successfully.",
      data: user,
    });
  });

  update = this.catchAsync(async (req: Request, res: Response) => {
    const { updated, before } = await UserService.update(req.params.id, req.body);
    await auditService.log({
      req,
      action: "user.update",
      module: "users",
      resource_id: req.params.id,
      before: { name: before.name, email: before.email, role: before.role, status: before.status },
      after: { name: updated?.name, email: updated?.email, role: updated?.role, status: updated?.status },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "User updated successfully.",
      data: updated,
    });
  });

  remove = this.catchAsync(async (req: Request, res: Response) => {
    const before = await UserService.remove(
      req.params.id,
      (req.user as IAuthUser).id
    );
    await auditService.log({
      req,
      action: "user.delete",
      module: "users",
      resource_id: req.params.id,
      before: { name: before.name, email: before.email },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "User deleted successfully.",
      data: null,
    });
  });
}

export const UserController = new Controller();
