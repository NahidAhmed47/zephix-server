import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import {
  PERMISSION_CATALOG,
  PERMISSION_KEYS,
  SCOPED_MODULES,
} from "@/constants/permissions";

class Controller extends BaseController {
  list = this.catchAsync(async (_req: Request, res: Response) => {
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Permission catalog.",
      data: {
        catalog: PERMISSION_CATALOG,
        keys: PERMISSION_KEYS,
        scoped_modules: SCOPED_MODULES,
      },
    });
  });
}

export const PermissionController = new Controller();
