import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { SettingService } from "./setting.service";
import { auditService } from "@/services/audit.service";

class Controller extends BaseController {
  get = this.catchAsync(async (_req: Request, res: Response) => {
    const setting = await SettingService.get();
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Settings fetched successfully.",
      data: setting,
    });
  });

  update = this.catchAsync(async (req: Request, res: Response) => {
    const setting = await SettingService.update(req.body);
    // Note credential changes without recording the secret values themselves.
    const changedCredentials =
      !!req.body?.communication?.sms?.api_key ||
      !!req.body?.communication?.smtp?.pass;
    await auditService.log({
      req,
      action: changedCredentials ? "settings.credentials.update" : "settings.update",
      module: "settings",
      after: { changed_keys: Object.keys(req.body || {}) },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Settings updated successfully.",
      data: setting,
    });
  });
}

export const SettingController = new Controller();
