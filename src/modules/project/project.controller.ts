import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { ProjectService } from "./project.service";
import { auditService } from "@/services/audit.service";
import { getPaginationOptions, getStringFilters } from "@/shared/queryOptions";
import { IAuthUser } from "@/lib/rbac";

class Controller extends BaseController {
  create = this.catchAsync(async (req: Request, res: Response) => {
    const project = await ProjectService.create(
      req.body,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "project.create",
      module: "projects",
      resource_id: String(project?._id),
      after: { name: project?.name },
    });
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Project created successfully.",
      data: project,
    });
  });

  list = this.catchAsync(async (req: Request, res: Response) => {
    const options = getPaginationOptions(req);
    const filters = getStringFilters(req, [
      "status",
      "client",
      "contract",
      "priority",
      "project_manager",
      "search",
    ]);
    const result = await ProjectService.list(
      options,
      filters,
      req.user as IAuthUser
    );
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Projects fetched successfully.",
      data: result,
    });
  });

  getOne = this.catchAsync(async (req: Request, res: Response) => {
    const project = await ProjectService.getById(
      req.params.id,
      req.user as IAuthUser
    );
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Project fetched successfully.",
      data: project,
    });
  });

  summary = this.catchAsync(async (req: Request, res: Response) => {
    const summary = await ProjectService.summary(
      req.params.id,
      req.user as IAuthUser
    );
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Project summary fetched successfully.",
      data: summary,
    });
  });

  update = this.catchAsync(async (req: Request, res: Response) => {
    const { updated, before } = await ProjectService.update(
      req.params.id,
      req.body,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "project.update",
      module: "projects",
      resource_id: req.params.id,
      before: { name: before.name, status: before.status },
      after: { name: updated?.name, status: updated?.status },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Project updated successfully.",
      data: updated,
    });
  });

  remove = this.catchAsync(async (req: Request, res: Response) => {
    const before = await ProjectService.remove(
      req.params.id,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "project.delete",
      module: "projects",
      resource_id: req.params.id,
      before: { name: before.name },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Project deleted successfully.",
      data: null,
    });
  });
}

export const ProjectController = new Controller();
