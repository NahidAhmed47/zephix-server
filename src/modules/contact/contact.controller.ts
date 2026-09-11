import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { ContactService } from "./contact.service";
import { auditService } from "@/services/audit.service";
import { getPaginationOptions, getStringFilters } from "@/shared/queryOptions";
import { IAuthUser } from "@/lib/rbac";

class Controller extends BaseController {
  create = this.catchAsync(async (req: Request, res: Response) => {
    const contact = await ContactService.create(req.body, req.user as IAuthUser);
    await auditService.log({
      req,
      action: "contact.create",
      module: "contacts",
      resource_id: String(contact?._id),
      after: { name: contact?.name },
    });
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Contact created successfully.",
      data: contact,
    });
  });

  list = this.catchAsync(async (req: Request, res: Response) => {
    const options = getPaginationOptions(req);
    const filters = getStringFilters(req, ["client", "search", "status"]);
    const result = await ContactService.list(options, filters, req.user as IAuthUser);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Contacts fetched successfully.",
      data: result,
    });
  });

  getOne = this.catchAsync(async (req: Request, res: Response) => {
    const contact = await ContactService.getById(req.params.id, req.user as IAuthUser);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Contact fetched successfully.",
      data: contact,
    });
  });

  update = this.catchAsync(async (req: Request, res: Response) => {
    const { updated, before } = await ContactService.update(
      req.params.id,
      req.body,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "contact.update",
      module: "contacts",
      resource_id: req.params.id,
      before: { name: before.name },
      after: { name: updated?.name },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Contact updated successfully.",
      data: updated,
    });
  });

  remove = this.catchAsync(async (req: Request, res: Response) => {
    const before = await ContactService.remove(req.params.id, req.user as IAuthUser);
    await auditService.log({
      req,
      action: "contact.delete",
      module: "contacts",
      resource_id: req.params.id,
      before: { name: before.name },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Contact deleted successfully.",
      data: null,
    });
  });
}

export const ContactController = new Controller();
