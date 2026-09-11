import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import {
  ServiceCatalogService,
  ServiceCategoryService,
} from "./service.service";
import { auditService } from "@/services/audit.service";
import { getPaginationOptions, getStringFilters } from "@/shared/queryOptions";
import { IAuthUser } from "@/lib/rbac";

class Controller extends BaseController {
  create = this.catchAsync(async (req: Request, res: Response) => {
    const service = await ServiceCatalogService.create(
      req.body,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "service.create",
      module: "services",
      resource_id: String(service?._id),
      after: { name: service?.name },
    });
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Service created successfully.",
      data: service,
    });
  });

  list = this.catchAsync(async (req: Request, res: Response) => {
    const options = getPaginationOptions(req);
    const filters = getStringFilters(req, [
      "category",
      "pricing_model",
      "active",
      "search",
    ]);
    const result = await ServiceCatalogService.list(options, filters);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Services fetched successfully.",
      data: result,
    });
  });

  getOne = this.catchAsync(async (req: Request, res: Response) => {
    const service = await ServiceCatalogService.getById(req.params.id);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Service fetched successfully.",
      data: service,
    });
  });

  update = this.catchAsync(async (req: Request, res: Response) => {
    const { updated, before } = await ServiceCatalogService.update(
      req.params.id,
      req.body
    );
    await auditService.log({
      req,
      action: "service.update",
      module: "services",
      resource_id: req.params.id,
      before: { name: before.name, is_active: before.is_active },
      after: { name: updated?.name, is_active: updated?.is_active },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Service updated successfully.",
      data: updated,
    });
  });

  remove = this.catchAsync(async (req: Request, res: Response) => {
    const before = await ServiceCatalogService.remove(req.params.id);
    await auditService.log({
      req,
      action: "service.delete",
      module: "services",
      resource_id: req.params.id,
      before: { name: before.name },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Service deleted successfully.",
      data: null,
    });
  });
}

class CategoryController extends BaseController {
  create = this.catchAsync(async (req: Request, res: Response) => {
    const category = await ServiceCategoryService.create(
      req.body,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "service_category.create",
      module: "services",
      resource_id: String(category?._id),
      after: { name: category?.name },
    });
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Service category created successfully.",
      data: category,
    });
  });

  list = this.catchAsync(async (req: Request, res: Response) => {
    const options = getPaginationOptions(req);
    const filters = getStringFilters(req, ["active", "search"]);
    const result = await ServiceCategoryService.list(options, filters);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Service categories fetched successfully.",
      data: result,
    });
  });

  getOne = this.catchAsync(async (req: Request, res: Response) => {
    const category = await ServiceCategoryService.getById(req.params.id);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Service category fetched successfully.",
      data: category,
    });
  });

  update = this.catchAsync(async (req: Request, res: Response) => {
    const { updated, before } = await ServiceCategoryService.update(
      req.params.id,
      req.body
    );
    await auditService.log({
      req,
      action: "service_category.update",
      module: "services",
      resource_id: req.params.id,
      before: { name: before.name, is_active: before.is_active },
      after: { name: updated?.name, is_active: updated?.is_active },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Service category updated successfully.",
      data: updated,
    });
  });

  remove = this.catchAsync(async (req: Request, res: Response) => {
    const before = await ServiceCategoryService.remove(req.params.id);
    await auditService.log({
      req,
      action: "service_category.delete",
      module: "services",
      resource_id: req.params.id,
      before: { name: before.name },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Service category deleted successfully.",
      data: null,
    });
  });
}

export const ServiceController = new Controller();
export const ServiceCategoryController = new CategoryController();
