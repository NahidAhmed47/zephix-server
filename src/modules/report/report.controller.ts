import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { ReportService } from "./report.service";
import { parseRange } from "@/shared/dateRange";

class Controller extends BaseController {
  private ok(res: Response, data: unknown, message = "Report fetched successfully.") {
    this.sendResponse(res, { statusCode: 200, success: true, message, data });
  }

  revenue = this.catchAsync(async (req: Request, res: Response) => {
    this.ok(res, await ReportService.revenue(parseRange(req)));
  });

  collections = this.catchAsync(async (req: Request, res: Response) => {
    this.ok(res, await ReportService.collections(parseRange(req)));
  });

  expenses = this.catchAsync(async (req: Request, res: Response) => {
    this.ok(res, await ReportService.expenses(parseRange(req)));
  });

  outstanding = this.catchAsync(async (_req: Request, res: Response) => {
    this.ok(res, await ReportService.outstandingAging());
  });

  services = this.catchAsync(async (req: Request, res: Response) => {
    this.ok(res, await ReportService.serviceRevenue(parseRange(req)));
  });

  clients = this.catchAsync(async (req: Request, res: Response) => {
    this.ok(res, await ReportService.clientRevenue(parseRange(req)));
  });

  mrrArr = this.catchAsync(async (_req: Request, res: Response) => {
    this.ok(res, await ReportService.mrrArr());
  });

  forecast = this.catchAsync(async (req: Request, res: Response) => {
    const months = Number((req.query.months as string) || 6);
    this.ok(res, await ReportService.forecast(months));
  });

  profitability = this.catchAsync(async (req: Request, res: Response) => {
    this.ok(res, await ReportService.profitability(parseRange(req)));
  });
}

export const ReportController = new Controller();
