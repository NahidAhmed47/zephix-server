import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { ExpenseService } from "./expense.service";
import { auditService } from "@/services/audit.service";
import { getPaginationOptions, getStringFilters } from "@/shared/queryOptions";
import { IAuthUser } from "@/lib/rbac";

class Controller extends BaseController {
  create = this.catchAsync(async (req: Request, res: Response) => {
    const expense = await ExpenseService.create(req.body, req.user as IAuthUser);
    await auditService.log({
      req,
      action: "expense.create",
      module: "expenses",
      resource_id: String(expense?._id),
      after: { title: expense?.title, amount: expense?.amount },
    });
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Expense created successfully.",
      data: expense,
    });
  });

  list = this.catchAsync(async (req: Request, res: Response) => {
    const options = getPaginationOptions(req);
    const filters = getStringFilters(req, [
      "category",
      "client",
      "project",
      "search",
    ]);
    const result = await ExpenseService.list(options, filters, req.user as IAuthUser);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Expenses fetched successfully.",
      data: result,
    });
  });

  stats = this.catchAsync(async (req: Request, res: Response) => {
    const result = await ExpenseService.stats(req.user as IAuthUser);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Expense stats fetched successfully.",
      data: result,
    });
  });

  getOne = this.catchAsync(async (req: Request, res: Response) => {
    const expense = await ExpenseService.getById(
      req.params.id,
      req.user as IAuthUser
    );
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Expense fetched successfully.",
      data: expense,
    });
  });

  update = this.catchAsync(async (req: Request, res: Response) => {
    const { updated } = await ExpenseService.update(
      req.params.id,
      req.body,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "expense.update",
      module: "expenses",
      resource_id: req.params.id,
      after: { title: updated?.title },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Expense updated successfully.",
      data: updated,
    });
  });

  remove = this.catchAsync(async (req: Request, res: Response) => {
    const before = await ExpenseService.remove(
      req.params.id,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "expense.delete",
      module: "expenses",
      resource_id: req.params.id,
      before: { title: before.title, amount: before.amount },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Expense deleted successfully.",
      data: null,
    });
  });
}

export const ExpenseController = new Controller();
