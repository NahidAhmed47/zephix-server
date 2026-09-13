import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { ContractService } from "./contract.service";
import { auditService } from "@/services/audit.service";
import { getPaginationOptions, getStringFilters } from "@/shared/queryOptions";
import { IAuthUser } from "@/lib/rbac";

class Controller extends BaseController {
  create = this.catchAsync(async (req: Request, res: Response) => {
    const contract = await ContractService.create(
      req.body,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "contract.create",
      module: "contracts",
      resource_id: String(contract?._id),
      after: { contract_number: contract?.contract_number, name: contract?.name },
    });
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Contract created successfully.",
      data: contract,
    });
  });

  list = this.catchAsync(async (req: Request, res: Response) => {
    const options = getPaginationOptions(req);
    const filters = getStringFilters(req, [
      "status",
      "client",
      "account_manager",
      "search",
    ]);
    const result = await ContractService.list(
      options,
      filters,
      req.user as IAuthUser
    );
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Contracts fetched successfully.",
      data: result,
    });
  });

  expiring = this.catchAsync(async (req: Request, res: Response) => {
    const days = Number((req.query.days as string) || 90);
    const result = await ContractService.expiring(days, req.user as IAuthUser);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Expiring contracts fetched successfully.",
      data: result,
    });
  });

  getOne = this.catchAsync(async (req: Request, res: Response) => {
    const contract = await ContractService.getById(
      req.params.id,
      req.user as IAuthUser
    );
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Contract fetched successfully.",
      data: contract,
    });
  });

  update = this.catchAsync(async (req: Request, res: Response) => {
    const { updated, before } = await ContractService.update(
      req.params.id,
      req.body,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "contract.update",
      module: "contracts",
      resource_id: req.params.id,
      before: { name: before.name, status: before.status },
      after: { name: updated?.name, status: updated?.status },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Contract updated successfully.",
      data: updated,
    });
  });

  renew = this.catchAsync(async (req: Request, res: Response) => {
    const { updated, before } = await ContractService.renew(
      req.params.id,
      req.body,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "contract.renew",
      module: "contracts",
      resource_id: req.params.id,
      before: { end_date: before.end_date, status: before.status },
      after: { end_date: updated?.end_date, status: updated?.status },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Contract renewed successfully.",
      data: updated,
    });
  });

  generateInvoice = this.catchAsync(async (req: Request, res: Response) => {
    const invoice = await ContractService.generateInvoice(
      req.params.id,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "contract.generate_invoice",
      module: "contracts",
      resource_id: req.params.id,
      after: {
        invoice_number: (invoice as { invoice_number?: string })
          ?.invoice_number,
      },
    });
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Draft invoice generated from contract.",
      data: invoice,
    });
  });

  generateSchedules = this.catchAsync(async (req: Request, res: Response) => {
    const result = await ContractService.generateSchedules(
      req.params.id,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "contract.generate_schedules",
      module: "contracts",
      resource_id: req.params.id,
      after: result,
    });
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: `Created ${result.created} schedule(s), skipped ${result.skipped}.`,
      data: result,
    });
  });

  remove = this.catchAsync(async (req: Request, res: Response) => {
    const before = await ContractService.remove(
      req.params.id,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "contract.delete",
      module: "contracts",
      resource_id: req.params.id,
      before: { contract_number: before.contract_number, name: before.name },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Contract deleted successfully.",
      data: null,
    });
  });
}

export const ContractController = new Controller();
