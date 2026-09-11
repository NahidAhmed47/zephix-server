import { NextFunction, Request, Response } from "express";
import ApiError from "./error";
import { HttpStatusCode } from "@/lib/httpStatus";
import JwtHelper from "@/helpers/jwtHelper";
import { UserModel } from "@/modules/user/user.model";
import { USER_STATUS } from "@/modules/user/user.interface";
import { IRole } from "@/modules/role/role.interface";
import { IAuthUser } from "@/lib/rbac";
import { envConfig } from "@/config";

/**
 * Authenticates the request: verifies the JWT (Authorization header — raw token
 * or "Bearer <token>" — or the access cookie), loads the user + role, and
 * attaches a normalized IAuthUser to req.user. This is the security boundary.
 */
export const auth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const header = req.headers.authorization;
    const cookieToken = req.cookies?.[envConfig.jwt.access_cookie_name];
    const token =
      (header && header.replace(/^Bearer\s+/i, "").trim()) || cookieToken;

    if (!token) {
      throw new ApiError(
        HttpStatusCode.UNAUTHORIZED,
        "Authentication required. Please log in."
      );
    }

    const payload = JwtHelper.verifyToken(token);

    const user = await UserModel.findById(payload.id).populate("role");
    if (!user || user.is_Deleted) {
      throw new ApiError(
        HttpStatusCode.UNAUTHORIZED,
        "Your account no longer exists. Please log in again."
      );
    }
    if (user.status !== USER_STATUS.ACTIVE) {
      throw new ApiError(
        HttpStatusCode.FORBIDDEN,
        "Your account is not active. Please contact an administrator."
      );
    }

    const role = user.role as unknown as IRole | null;

    const authUser: IAuthUser = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: role?.slug || "",
      permissions: role?.permissions || [],
      scopes: role?.scopes || {},
    };

    req.user = authUser;
    next();
  } catch (err) {
    next(err);
  }
};
