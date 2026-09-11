import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { DashboardService } from "./dashboard.service";

class Controller extends BaseController {
  summary = this.catchAsync(async (_req: Request, res: Response) => {
    const data = await DashboardService.summary();
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Dashboard fetched successfully.",
      data,
    });
  });
}

export const DashboardController = new Controller();
