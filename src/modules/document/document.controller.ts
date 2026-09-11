import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { DocumentService } from "./document.service";
import { auditService } from "@/services/audit.service";
import { getPaginationOptions, getStringFilters } from "@/shared/queryOptions";
import { IAuthUser } from "@/lib/rbac";

class Controller extends BaseController {
  upload = this.catchAsync(async (req: Request, res: Response) => {
    const doc = await DocumentService.upload(
      req.file,
      req.body,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "document.upload",
      module: "documents",
      resource_id: String(doc?._id),
      after: { name: doc?.name, entity_type: doc?.entity_type },
    });
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Document uploaded successfully.",
      data: doc,
    });
  });

  list = this.catchAsync(async (req: Request, res: Response) => {
    const options = getPaginationOptions(req);
    const filters = getStringFilters(req, [
      "entity_type",
      "entity_id",
      "search",
    ]);
    const result = await DocumentService.list(options, filters);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Documents fetched successfully.",
      data: result,
    });
  });

  remove = this.catchAsync(async (req: Request, res: Response) => {
    const before = await DocumentService.remove(req.params.id);
    await auditService.log({
      req,
      action: "document.delete",
      module: "documents",
      resource_id: req.params.id,
      before: { name: before.name },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Document deleted successfully.",
      data: null,
    });
  });
}

export const DocumentController = new Controller();
