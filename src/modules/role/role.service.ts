import slugify from "slugify";
import ApiError from "@/middlewares/error";
import { HttpStatusCode } from "@/lib/httpStatus";
import { RoleModel } from "./role.model";
import { IRole } from "./role.interface";
import { UserModel } from "@/modules/user/user.model";
import { isValidPermissionKey, WILDCARD_PERMISSION } from "@/constants/permissions";

const validatePermissions = (permissions: string[]): void => {
  const invalid = (permissions || []).filter((p) => !isValidPermissionKey(p));
  if (invalid.length) {
    throw new ApiError(
      HttpStatusCode.BAD_REQUEST,
      `Unknown permission key(s): ${invalid.join(", ")}`
    );
  }
};

const makeSlug = (name: string): string =>
  slugify(name, { lower: true, strict: true });

interface CreateRoleInput {
  name: string;
  description?: string;
  permissions?: string[];
  scopes?: Record<string, string>;
}

class Service {
  async create(data: CreateRoleInput) {
    validatePermissions(data.permissions || []);
    const slug = makeSlug(data.name);
    if (!slug) {
      throw new ApiError(HttpStatusCode.BAD_REQUEST, "Invalid role name.");
    }
    const existing = await RoleModel.findOne({ slug });
    if (existing && !existing.is_Deleted) {
      throw new ApiError(
        HttpStatusCode.CONFLICT,
        "A role with this name already exists."
      );
    }
    if (existing && existing.is_Deleted) {
      return RoleModel.findByIdAndUpdate(
        existing._id,
        { ...data, slug, is_Deleted: false, is_system: false },
        { new: true }
      );
    }
    return RoleModel.create({ ...data, slug, is_system: false });
  }

  async list() {
    const roles = await RoleModel.find({ is_Deleted: false })
      .sort({ is_system: -1, name: 1 })
      .lean();
    const counts = await UserModel.aggregate([
      { $match: { is_Deleted: false } },
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);
    const map = new Map(counts.map((c) => [String(c._id), c.count as number]));
    return roles.map((r) => ({ ...r, userCount: map.get(String(r._id)) || 0 }));
  }

  async getById(id: string) {
    const role = await RoleModel.findOne({ _id: id, is_Deleted: false });
    if (!role) throw new ApiError(HttpStatusCode.NOT_FOUND, "Role not found.");
    return role;
  }

  async update(id: string, data: Partial<IRole>) {
    const role = await RoleModel.findById(id);
    if (!role || role.is_Deleted) {
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Role not found.");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = { ...data };
    delete patch.is_system;
    delete patch.is_Deleted;

    if (role.is_system) {
      // Built-in roles: only description/scopes may change; keep name/slug/perms.
      delete patch.permissions;
      delete patch.slug;
      delete patch.name;
    } else {
      if (data.permissions) validatePermissions(data.permissions);
      if (data.name) {
        patch.slug = makeSlug(data.name);
        const dup = await RoleModel.findOne({
          slug: patch.slug,
          _id: { $ne: id },
        });
        if (dup) {
          throw new ApiError(
            HttpStatusCode.CONFLICT,
            "A role with this name already exists."
          );
        }
      }
    }

    const before = role.toObject();
    const updated = await RoleModel.findByIdAndUpdate(id, patch, { new: true });
    return { updated, before };
  }

  async remove(id: string) {
    const role = await RoleModel.findById(id);
    if (!role || role.is_Deleted) {
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Role not found.");
    }
    if (role.is_system) {
      throw new ApiError(
        HttpStatusCode.BAD_REQUEST,
        "System roles cannot be deleted."
      );
    }
    if (role.permissions.includes(WILDCARD_PERMISSION)) {
      throw new ApiError(
        HttpStatusCode.BAD_REQUEST,
        "Super Admin role cannot be deleted."
      );
    }
    const assigned = await UserModel.countDocuments({
      role: id,
      is_Deleted: false,
    });
    if (assigned > 0) {
      throw new ApiError(
        HttpStatusCode.BAD_REQUEST,
        `Cannot delete: ${assigned} user(s) still use this role. Reassign them first.`
      );
    }
    await RoleModel.findByIdAndUpdate(id, { is_Deleted: true });
    return role;
  }
}

export const RoleService = new Service();
