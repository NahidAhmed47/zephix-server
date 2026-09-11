import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { RecurringBillingService } from "./recurringBilling.service";
import { RECURRING_STATUS } from "./recurringBilling.enum";
import { auditService } from "@/services/audit.service";
import { getPaginationOptions, getStringFilters } from "@/shared/queryOptions";
import { IAuthUser } from "@/lib/rbac";

class Controller extends BaseController {
  create = this.catchAsync(async (req: Request, res: Response) => {
    const schedule = await RecurringBillingService.create(
      req.body,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "recurring_billing.create",
      module: "recurring_billing",
      resource_id: String(schedule?._id),
      after: { amount: schedule?.amount, frequency: schedule?.frequency },
    });
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Recurring schedule created successfully.",
      data: schedule,
    });
  });

  list = this.catchAsync(async (req: Request, res: Response) => {
    const options = getPaginationOptions(req);
    const filters = getStringFilters(req, ["status", "client", "contract"]);
    const result = await RecurringBillingService.list(
      options,
      filters,
      req.user as IAuthUser
    );
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Recurring schedules fetched successfully.",
      data: result,
    });
  });

  stats = this.catchAsync(async (req: Request, res: Response) => {
    const result = await RecurringBillingService.stats(req.user as IAuthUser);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Recurring billing stats fetched successfully.",
      data: result,
    });
  });

  getOne = this.catchAsync(async (req: Request, res: Response) => {
    const schedule = await RecurringBillingService.getById(
      req.params.id,
      req.user as IAuthUser
    );
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Recurring schedule fetched successfully.",
      data: schedule,
    });
  });

  update = this.catchAsync(async (req: Request, res: Response) => {
    const { updated } = await RecurringBillingService.update(
      req.params.id,
      req.body,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "recurring_billing.update",
      module: "recurring_billing",
      resource_id: req.params.id,
      after: { status: updated?.status },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Recurring schedule updated successfully.",
      data: updated,
    });
  });

  generate = this.catchAsync(async (req: Request, res: Response) => {
    const result = await RecurringBillingService.generate(
      req.params.id,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "recurring_billing.generate_invoice",
      module: "recurring_billing",
      resource_id: req.params.id,
      after: { invoice_number: result.invoice?.invoice_number },
    });
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Invoice generated from schedule.",
      data: result,
    });
  });

  pause = this.catchAsync(async (req: Request, res: Response) => {
    const { updated } = await RecurringBillingService.setStatus(
      req.params.id,
      RECURRING_STATUS.PAUSED,
      req.user as IAuthUser
    );
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Schedule paused.",
      data: updated,
    });
  });

  resume = this.catchAsync(async (req: Request, res: Response) => {
    const { updated } = await RecurringBillingService.setStatus(
      req.params.id,
      RECURRING_STATUS.ACTIVE,
      req.user as IAuthUser
    );
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Schedule resumed.",
      data: updated,
    });
  });

  remove = this.catchAsync(async (req: Request, res: Response) => {
    await RecurringBillingService.remove(req.params.id, req.user as IAuthUser);
    await auditService.log({
      req,
      action: "recurring_billing.delete",
      module: "recurring_billing",
      resource_id: req.params.id,
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Recurring schedule deleted successfully.",
      data: null,
    });
  });
}

export const RecurringBillingController = new Controller();
