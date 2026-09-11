import { NextFunction, Request, Response } from "express";
import ApiError from "./error";
import { HttpStatusCode } from "@/lib/httpStatus";
import { can, IAuthUser } from "@/lib/rbac";

/**
 * Authorizes the request against one or more permission keys (OR semantics).
 * Must run after `auth`. Super Admin (wildcard) bypasses automatically.
 */
export const requirePermission =
  (key: string | string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user as IAuthUser | undefined;
    if (!user) {
      return next(
        new ApiError(HttpStatusCode.UNAUTHORIZED, "Authentication required.")
      );
    }
    if (!can(user.permissions, key)) {
      return next(
        new ApiError(
          HttpStatusCode.FORBIDDEN,
          "You do not have permission to perform this action."
        )
      );
    }
    next();
  };
