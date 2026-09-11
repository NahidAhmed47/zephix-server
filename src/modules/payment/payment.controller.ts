import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { PaymentService } from "./payment.service";
import { auditService } from "@/services/audit.service";
import { getPaginationOptions, getStringFilters } from "@/shared/queryOptions";
import { IAuthUser } from "@/lib/rbac";

class Controller extends BaseController {
  create = this.catchAsync(async (req: Request, res: Response) => {
    const payment = await PaymentService.create(req.body, req.user as IAuthUser);
    await auditService.log({
      req,
      action: "payment.create",
      module: "payments",
      resource_id: String(payment?._id),
      after: {
        payment_number: payment?.payment_number,
        amount: payment?.amount,
      },
    });
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Payment recorded successfully.",
      data: payment,
    });
  });

  list = this.catchAsync(async (req: Request, res: Response) => {
    const options = getPaginationOptions(req);
    const filters = getStringFilters(req, [
      "invoice",
      "client",
      "method",
      "search",
    ]);
    const result = await PaymentService.list(options, filters, req.user as IAuthUser);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Payments fetched successfully.",
      data: result,
    });
  });

  getOne = this.catchAsync(async (req: Request, res: Response) => {
    const payment = await PaymentService.getById(
      req.params.id,
      req.user as IAuthUser
    );
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Payment fetched successfully.",
      data: payment,
    });
  });

  update = this.catchAsync(async (req: Request, res: Response) => {
    const { updated, before } = await PaymentService.update(
      req.params.id,
      req.body,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "payment.update",
      module: "payments",
      resource_id: req.params.id,
      before: { amount: before.amount },
      after: { amount: updated?.amount },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Payment updated successfully.",
      data: updated,
    });
  });

  remove = this.catchAsync(async (req: Request, res: Response) => {
    const before = await PaymentService.remove(
      req.params.id,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "payment.delete",
      module: "payments",
      resource_id: req.params.id,
      before: {
        payment_number: before.payment_number,
        amount: before.amount,
      },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Payment deleted successfully.",
      data: null,
    });
  });
}

export const PaymentController = new Controller();
