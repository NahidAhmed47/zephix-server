import ApiError from "@/middlewares/error";
import { HttpStatusCode } from "@/lib/httpStatus";
import { BcryptInstance } from "@/lib/bcrypt";
import JwtHelper from "@/helpers/jwtHelper";
import { UserModel } from "@/modules/user/user.model";
import { USER_STATUS } from "@/modules/user/user.interface";
import { IRole } from "@/modules/role/role.interface";
import { expandPermissions } from "@/lib/rbac";
import { ILoginCredentials, IChangePassword } from "@/interfaces/common.interface";

const sanitizeUser = (user: any) => {
  const role = user.role as IRole | null;
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone_number: user.phone_number,
    image: user.image,
    status: user.status,
    department: user.department,
    last_login_at: user.last_login_at,
    role: role
      ? {
          id: String((role as any)._id),
          name: role.name,
          slug: role.slug,
          permissions: expandPermissions(role.permissions || []),
          scopes: role.scopes || {},
        }
      : null,
  };
};

class Service {
  async login(data: ILoginCredentials) {
    const user = await UserModel.findOne({ email: data.email.toLowerCase() })
      .select("+password")
      .populate("role");

    // Generic message — do not reveal whether the email exists.
    const invalid = new ApiError(
      HttpStatusCode.UNAUTHORIZED,
      "Invalid email or password."
    );
    if (!user || user.is_Deleted) throw invalid;

    if (user.status !== USER_STATUS.ACTIVE) {
      throw new ApiError(
        HttpStatusCode.FORBIDDEN,
        "Your account is not active. Please contact an administrator."
      );
    }

    const matched = await BcryptInstance.compare(data.password, user.password);
    if (!matched) throw invalid;

    await UserModel.findByIdAndUpdate(user._id, { last_login_at: new Date() });

    const role = user.role as unknown as IRole | null;
    const { access_token, refresh_token } = await JwtHelper.generateTokens({
      id: String(user._id),
      email: user.email,
      role: role?.slug || "",
      name: user.name,
    });

    return { user: sanitizeUser(user), access_token, refresh_token };
  }

  async me(userId: string) {
    const user = await UserModel.findById(userId).populate("role");
    if (!user || user.is_Deleted) {
      throw new ApiError(HttpStatusCode.NOT_FOUND, "User not found.");
    }
    return sanitizeUser(user);
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new ApiError(HttpStatusCode.UNAUTHORIZED, "Refresh token required.");
    }
    const payload = JwtHelper.verifyToken(refreshToken);
    const user = await UserModel.findById(payload.id).populate("role");
    if (!user || user.is_Deleted || user.status !== USER_STATUS.ACTIVE) {
      throw new ApiError(HttpStatusCode.UNAUTHORIZED, "Session is no longer valid.");
    }
    const role = user.role as unknown as IRole | null;
    const { access_token, refresh_token } = await JwtHelper.generateTokens({
      id: String(user._id),
      email: user.email,
      role: role?.slug || "",
      name: user.name,
    });
    return { access_token, refresh_token };
  }

  async changePassword(userId: string, data: IChangePassword) {
    const user = await UserModel.findById(userId).select("+password");
    if (!user) throw new ApiError(HttpStatusCode.NOT_FOUND, "User not found.");

    const matched = await BcryptInstance.compare(
      data.old_password,
      user.password
    );
    if (!matched) {
      throw new ApiError(
        HttpStatusCode.BAD_REQUEST,
        "Your current password is incorrect."
      );
    }
    const same = await BcryptInstance.compare(data.new_password, user.password);
    if (same) {
      throw new ApiError(
        HttpStatusCode.BAD_REQUEST,
        "New password must be different from the current password."
      );
    }
    const hashed = await BcryptInstance.hash(data.new_password);
    await UserModel.findByIdAndUpdate(user._id, { password: hashed });
  }
}

export const AuthService = new Service();
export { sanitizeUser };
