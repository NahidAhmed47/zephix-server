import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { DealService } from "./deal.service";
import { auditService } from "@/services/audit.service";
import { getPaginationOptions, getStringFilters } from "@/shared/queryOptions";
import { IAuthUser } from "@/lib/rbac";

class Controller extends BaseController {
  create = this.catchAsync(async (req: Request, res: Response) => {
    const deal = await DealService.create(req.body, req.user as IAuthUser);
    await auditService.log({
      req,
      action: "deal.create",
      module: "deals",
      resource_id: String(deal?._id),
      after: { name: deal?.name, stage: deal?.stage },
    });
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Deal created successfully.",
      data: deal,
    });
  });

  list = this.catchAsync(async (req: Request, res: Response) => {
    const options = getPaginationOptions(req);
    const filters = getStringFilters(req, ["stage", "client", "owner", "search"]);
    const result = await DealService.list(options, filters, req.user as IAuthUser);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Deals fetched successfully.",
      data: result,
    });
  });

  pipeline = this.catchAsync(async (req: Request, res: Response) => {
    const data = await DealService.pipeline(req.user as IAuthUser);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Pipeline fetched successfully.",
      data,
    });
  });

  getOne = this.catchAsync(async (req: Request, res: Response) => {
    const deal = await DealService.getById(req.params.id, req.user as IAuthUser);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Deal fetched successfully.",
      data: deal,
    });
  });

  update = this.catchAsync(async (req: Request, res: Response) => {
    const { updated, before } = await DealService.update(
      req.params.id,
      req.body,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "deal.update",
      module: "deals",
      resource_id: req.params.id,
      before: { name: before.name, stage: before.stage },
      after: { name: updated?.name, stage: updated?.stage },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Deal updated successfully.",
      data: updated,
    });
  });

  updateStage = this.catchAsync(async (req: Request, res: Response) => {
    const { updated, before } = await DealService.updateStage(
      req.params.id,
      req.body.stage,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "deal.stage",
      module: "deals",
      resource_id: req.params.id,
      before: { stage: before.stage },
      after: { stage: updated?.stage },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Deal stage updated.",
      data: updated,
    });
  });

  remove = this.catchAsync(async (req: Request, res: Response) => {
    const before = await DealService.remove(req.params.id, req.user as IAuthUser);
    await auditService.log({
      req,
      action: "deal.delete",
      module: "deals",
      resource_id: req.params.id,
      before: { name: before.name },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Deal deleted successfully.",
      data: null,
    });
  });
}

export const DealController = new Controller();
