import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { NotificationService } from "./notification.service";
import { getPaginationOptions } from "@/shared/queryOptions";
import { IAuthUser } from "@/lib/rbac";

class Controller extends BaseController {
  list = this.catchAsync(async (req: Request, res: Response) => {
    const result = await NotificationService.list(
      req.user as IAuthUser,
      getPaginationOptions(req)
    );
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Notifications fetched successfully.",
      data: result,
    });
  });

  unreadCount = this.catchAsync(async (req: Request, res: Response) => {
    const result = await NotificationService.unreadCount(req.user as IAuthUser);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Unread count fetched.",
      data: result,
    });
  });

  markRead = this.catchAsync(async (req: Request, res: Response) => {
    const result = await NotificationService.markRead(
      req.params.id,
      req.user as IAuthUser
    );
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Notification marked read.",
      data: result,
    });
  });

  markAllRead = this.catchAsync(async (req: Request, res: Response) => {
    const result = await NotificationService.markAllRead(req.user as IAuthUser);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "All notifications marked read.",
      data: result,
    });
  });
}

export const NotificationController = new Controller();
