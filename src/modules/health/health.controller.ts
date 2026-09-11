import { Request, Response } from "express";
import mongoose from "mongoose";
import BaseController from "@/shared/baseController";

class Controller extends BaseController {
  check = this.catchAsync(async (_req: Request, res: Response) => {
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Zephix server healthy",
      data: {
        uptime: Math.round(process.uptime()),
        db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        env: process.env.NODE_ENV || "development",
        time: new Date().toISOString(),
      },
    });
  });
}

export const HealthController = new Controller();
