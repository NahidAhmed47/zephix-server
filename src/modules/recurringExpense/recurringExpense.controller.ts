import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { RecurringExpenseService } from "./recurringExpense.service";
import { auditService } from "@/services/audit.service";
import { getPaginationOptions, getStringFilters } from "@/shared/queryOptions";

class Controller extends BaseController {
  create = this.catchAsync(async (req: Request, res: Response) => {
    const doc = await RecurringExpenseService.create(req.body);
    await auditService.log({
      req,
      action: "recurring_expense.create",
      module: "recurring_expenses",
      resource_id: String(doc?._id),
      after: { title: doc?.title, amount: doc?.amount },
    });
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Recurring expense created successfully.",
      data: doc,
    });
  });

  list = this.catchAsync(async (req: Request, res: Response) => {
    const options = getPaginationOptions(req);
    const filters = getStringFilters(req, ["status", "category", "search"]);
    const result = await RecurringExpenseService.list(options, filters);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Recurring expenses fetched successfully.",
      data: result,
    });
  });

  stats = this.catchAsync(async (_req: Request, res: Response) => {
    const result = await RecurringExpenseService.stats();
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Recurring expense stats fetched successfully.",
      data: result,
    });
  });

  getOne = this.catchAsync(async (req: Request, res: Response) => {
    const doc = await RecurringExpenseService.getById(req.params.id);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Recurring expense fetched successfully.",
      data: doc,
    });
  });

  update = this.catchAsync(async (req: Request, res: Response) => {
    const { updated } = await RecurringExpenseService.update(
      req.params.id,
      req.body
    );
    await auditService.log({
      req,
      action: "recurring_expense.update",
      module: "recurring_expenses",
      resource_id: req.params.id,
      after: { title: updated?.title },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Recurring expense updated successfully.",
      data: updated,
    });
  });

  remove = this.catchAsync(async (req: Request, res: Response) => {
    const before = await RecurringExpenseService.remove(req.params.id);
    await auditService.log({
      req,
      action: "recurring_expense.delete",
      module: "recurring_expenses",
      resource_id: req.params.id,
      before: { title: before.title },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Recurring expense deleted successfully.",
      data: null,
    });
  });
}

export const RecurringExpenseController = new Controller();
