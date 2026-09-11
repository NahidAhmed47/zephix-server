import ApiError from "@/middlewares/error";
import { HttpStatusCode } from "@/lib/httpStatus";
import { BcryptInstance } from "@/lib/bcrypt";
import { UserModel } from "./user.model";
import { USER_STATUS } from "./user.interface";
import { RoleModel } from "@/modules/role/role.model";
import { WILDCARD_PERMISSION } from "@/constants/permissions";
import { IPaginationOptions } from "@/interfaces/pagination.interfaces";
import { paginationHelpers } from "@/helpers/paginationHelpers";

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: string;
  phone_number?: string;
  status?: string;
  department?: string;
  image?: string;
}

type UpdateUserInput = Partial<CreateUserInput>;

const rolePopulate = { path: "role", select: "name slug" } as const;

/** Count active Super Admins (roles holding the wildcard permission). */
const superAdminCount = async (): Promise<number> => {
  const superRoles = await RoleModel.find({
    permissions: WILDCARD_PERMISSION,
    is_Deleted: false,
  }).select("_id");
  const ids = superRoles.map((r) => r._id);
  if (!ids.length) return 0;
  return UserModel.countDocuments({
    role: { $in: ids },
    status: USER_STATUS.ACTIVE,
    is_Deleted: false,
  });
};

const isSuperRole = async (roleId: unknown): Promise<boolean> => {
  if (!roleId) return false;
  const role = await RoleModel.findById(roleId as string);
  return !!role && (role.permissions || []).includes(WILDCARD_PERMISSION);
};

class Service {
  async create(data: CreateUserInput) {
    const email = data.email.toLowerCase().trim();
    const existing = await UserModel.findOne({ email });
    if (existing && !existing.is_Deleted) {
      throw new ApiError(
        HttpStatusCode.CONFLICT,
        "A user with this email already exists."
      );
    }
    const role = await RoleModel.findOne({ _id: data.role, is_Deleted: false });
    if (!role) {
      throw new ApiError(HttpStatusCode.BAD_REQUEST, "Invalid role selected.");
    }
    const password = await BcryptInstance.hash(data.password);

    if (existing && existing.is_Deleted) {
      await UserModel.findByIdAndUpdate(existing._id, {
        ...data,
        email,
        password,
        is_Deleted: false,
      });
      return UserModel.findById(existing._id).populate(rolePopulate);
    }

    const created = await UserModel.create({ ...data, email, password });
    return UserModel.findById(created._id).populate(rolePopulate);
  }

  async list(
    options: IPaginationOptions,
    filters: { search?: string; role?: string; status?: string }
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      paginationHelpers.calculatePagination(options);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cond: any = { is_Deleted: false };
    if (filters.role) cond.role = filters.role;
    if (filters.status) cond.status = filters.status;
    if (filters.search) {
      cond.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { email: { $regex: filters.search, $options: "i" } },
        { phone_number: { $regex: filters.search, $options: "i" } },
      ];
    }

    const [data, total] = await Promise.all([
      UserModel.find(cond)
        .populate(rolePopulate)
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(cond),
    ]);

    return { meta: { page, limit, total }, data };
  }

  async getById(id: string) {
    const user = await UserModel.findOne({ _id: id, is_Deleted: false }).populate(
      rolePopulate
    );
    if (!user) throw new ApiError(HttpStatusCode.NOT_FOUND, "User not found.");
    return user;
  }

  async update(id: string, data: UpdateUserInput) {
    const user = await UserModel.findById(id);
    if (!user || user.is_Deleted) {
      throw new ApiError(HttpStatusCode.NOT_FOUND, "User not found.");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = { ...data };

    if (data.email) {
      const email = data.email.toLowerCase().trim();
      const dup = await UserModel.findOne({ email, _id: { $ne: id } });
      if (dup) {
        throw new ApiError(
          HttpStatusCode.CONFLICT,
          "Another user already uses this email."
        );
      }
      patch.email = email;
    }

    if (data.password) {
      patch.password = await BcryptInstance.hash(data.password);
    } else {
      delete patch.password;
    }

    if (data.role) {
      const role = await RoleModel.findOne({ _id: data.role, is_Deleted: false });
      if (!role) {
        throw new ApiError(HttpStatusCode.BAD_REQUEST, "Invalid role selected.");
      }
    }

    // Protect the last active Super Admin from downgrade/deactivation.
    if (await isSuperRole(user.role)) {
      const willBeSuper = data.role ? await isSuperRole(data.role) : true;
      const willBeActive = data.status
        ? data.status === USER_STATUS.ACTIVE
        : user.status === USER_STATUS.ACTIVE;
      if ((!willBeSuper || !willBeActive) && (await superAdminCount()) <= 1) {
        throw new ApiError(
          HttpStatusCode.BAD_REQUEST,
          "This is the last active Super Admin — its role/status cannot be changed."
        );
      }
    }

    const before = user.toObject();
    delete (before as { password?: string }).password;

    const updated = await UserModel.findByIdAndUpdate(id, patch, {
      new: true,
    }).populate(rolePopulate);

    return { updated, before };
  }

  async remove(id: string, actorId?: string) {
    const user = await UserModel.findById(id);
    if (!user || user.is_Deleted) {
      throw new ApiError(HttpStatusCode.NOT_FOUND, "User not found.");
    }
    if (actorId && String(actorId) === String(id)) {
      throw new ApiError(
        HttpStatusCode.BAD_REQUEST,
        "You cannot delete your own account."
      );
    }
    if ((await isSuperRole(user.role)) && (await superAdminCount()) <= 1) {
      throw new ApiError(
        HttpStatusCode.BAD_REQUEST,
        "Cannot delete the last active Super Admin."
      );
    }
    await UserModel.findByIdAndUpdate(id, {
      is_Deleted: true,
      status: USER_STATUS.INACTIVE,
    });
    const before = user.toObject();
    delete (before as { password?: string }).password;
    return before;
  }
}

export const UserService = new Service();
