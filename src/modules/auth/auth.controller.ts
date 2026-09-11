import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { AuthService } from "./auth.service";
import { auditService } from "@/services/audit.service";
import { cookieManager } from "@/shared/cookie";
import { envConfig } from "@/config";
import { IAuthUser } from "@/lib/rbac";

class Controller extends BaseController {
  login = this.catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.login(req.body);
    cookieManager.setTokens(res, result.access_token, result.refresh_token);

    await auditService.log({
      req,
      actor: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role?.slug || "",
        permissions: [],
      },
      action: "login",
      module: "auth",
      resource_id: result.user.id,
    });

    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Logged in successfully.",
      data: result,
    });
  });

  me = this.catchAsync(async (req: Request, res: Response) => {
    const user = await AuthService.me((req.user as IAuthUser).id);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Current user.",
      data: user,
    });
  });

  refresh = this.catchAsync(async (req: Request, res: Response) => {
    const token =
      req.body?.refresh_token ||
      req.cookies?.[envConfig.jwt.refresh_cookie_name];
    const result = await AuthService.refresh(token);
    cookieManager.setTokens(res, result.access_token, result.refresh_token);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Token refreshed.",
      data: result,
    });
  });

  logout = this.catchAsync(async (req: Request, res: Response) => {
    cookieManager.clearTokens(res);
    if (req.user) {
      await auditService.log({ req, action: "logout", module: "auth" });
    }
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Logged out.",
      data: null,
    });
  });

  changePassword = this.catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as IAuthUser).id;
    await AuthService.changePassword(userId, req.body);
    await auditService.log({
      req,
      action: "change_password",
      module: "auth",
      resource_id: userId,
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Password changed successfully.",
      data: null,
    });
  });
}

export const AuthController = new Controller();
