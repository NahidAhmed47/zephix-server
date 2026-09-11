import ApiError from "@/middlewares/error";
import { HttpStatusCode } from "@/lib/httpStatus";
import { ServiceModel, ServiceCategoryModel } from "./service.model";
import { PRICING_MODEL } from "./service.enum";
import { IAuthUser } from "@/lib/rbac";
import { money, DEFAULT_CURRENCY } from "@/lib/money";
import { paginationHelpers } from "@/helpers/paginationHelpers";
import { IPaginationOptions } from "@/interfaces/pagination.interfaces";

const servicePopulate = [
  { path: "category", select: "name" },
  { path: "created_by", select: "name email" },
];

/**
 * Service catalog is a global, shared resource (not in SCOPED_MODULES), so
 * unlike clients/deals these methods do not apply a per-user scope filter.
 */
class ServiceCatalog {
  async create(data: Record<string, unknown>, user: IAuthUser) {
    const currency = (data.currency as string) || DEFAULT_CURRENCY;

    const doc = await ServiceModel.create({
      name: data.name,
      code: data.code || "",
      description: data.description || "",
      category: data.category || null,
      price: money((data.price as string | number) ?? 0, currency),
      cost: money((data.cost as string | number) ?? 0, currency),
      pricing_model: (data.pricing_model as string) || PRICING_MODEL.FIXED,
      estimated_duration_days: Number(data.estimated_duration_days ?? 0),
      unit: data.unit || "",
      tax_rate: Number(data.tax_rate ?? 0),
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
      notes: data.notes || "",
      created_by: user.id,
    });
    return this.getById(String(doc._id));
  }

  async list(
    options: IPaginationOptions,
    filters: {
      category?: string;
      pricing_model?: string;
      active?: string;
      search?: string;
    }
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      paginationHelpers.calculatePagination(options);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cond: any = { is_Deleted: false };
    if (filters.category) cond.category = filters.category;
    if (filters.pricing_model) cond.pricing_model = filters.pricing_model;
    if (filters.active === "true") cond.is_active = true;
    if (filters.active === "false") cond.is_active = false;
    if (filters.search) {
      cond.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { code: { $regex: filters.search, $options: "i" } },
      ];
    }

    const [data, total] = await Promise.all([
      ServiceModel.find(cond)
        .populate(servicePopulate)
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ServiceModel.countDocuments(cond),
    ]);
    return { meta: { page, limit, total }, data };
  }

  async getById(id: string) {
    const service = await ServiceModel.findOne({
      _id: id,
      is_Deleted: false,
    }).populate(servicePopulate);
    if (!service)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Service not found.");
    return service;
  }

  async update(id: string, data: Record<string, unknown>) {
    const before = await ServiceModel.findOne({ _id: id, is_Deleted: false });
    if (!before)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Service not found.");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = { ...data };
    const currency = (data.currency as string) || before.price.currency;
    if (data.price !== undefined || data.currency !== undefined) {
      const amount =
        data.price !== undefined
          ? (data.price as string | number)
          : before.price.amount.toString();
      patch.price = money(amount, currency);
    }
    if (data.cost !== undefined || data.currency !== undefined) {
      const amount =
        data.cost !== undefined
          ? (data.cost as string | number)
          : before.cost.amount.toString();
      patch.cost = money(amount, currency);
    }
    delete patch.currency;

    const updated = await ServiceModel.findByIdAndUpdate(id, patch, {
      new: true,
    }).populate(servicePopulate);
    return { updated, before: before.toObject() };
  }

  async remove(id: string) {
    const service = await ServiceModel.findOne({ _id: id, is_Deleted: false });
    if (!service)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Service not found.");
    await ServiceModel.findByIdAndUpdate(id, { is_Deleted: true });
    return service;
  }
}

const categoryPopulate = [{ path: "created_by", select: "name email" }];

class ServiceCategory {
  async create(data: Record<string, unknown>, user: IAuthUser) {
    const doc = await ServiceCategoryModel.create({
      name: data.name,
      description: data.description || "",
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
      created_by: user.id,
    });
    return ServiceCategoryModel.findById(doc._id).populate(categoryPopulate);
  }

  async list(
    options: IPaginationOptions,
    filters: { active?: string; search?: string }
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      paginationHelpers.calculatePagination(options);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cond: any = { is_Deleted: false };
    if (filters.active === "true") cond.is_active = true;
    if (filters.active === "false") cond.is_active = false;
    if (filters.search) cond.name = { $regex: filters.search, $options: "i" };

    const [data, total] = await Promise.all([
      ServiceCategoryModel.find(cond)
        .populate(categoryPopulate)
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ServiceCategoryModel.countDocuments(cond),
    ]);
    return { meta: { page, limit, total }, data };
  }

  async getById(id: string) {
    const category = await ServiceCategoryModel.findOne({
      _id: id,
      is_Deleted: false,
    }).populate(categoryPopulate);
    if (!category)
      throw new ApiError(
        HttpStatusCode.NOT_FOUND,
        "Service category not found."
      );
    return category;
  }

  async update(id: string, data: Record<string, unknown>) {
    const before = await ServiceCategoryModel.findOne({
      _id: id,
      is_Deleted: false,
    });
    if (!before)
      throw new ApiError(
        HttpStatusCode.NOT_FOUND,
        "Service category not found."
      );
    const updated = await ServiceCategoryModel.findByIdAndUpdate(id, data, {
      new: true,
    }).populate(categoryPopulate);
    return { updated, before: before.toObject() };
  }

  async remove(id: string) {
    const category = await ServiceCategoryModel.findOne({
      _id: id,
      is_Deleted: false,
    });
    if (!category)
      throw new ApiError(
        HttpStatusCode.NOT_FOUND,
        "Service category not found."
      );
    await ServiceCategoryModel.findByIdAndUpdate(id, { is_Deleted: true });
    return category;
  }
}

export const ServiceCatalogService = new ServiceCatalog();
export const ServiceCategoryService = new ServiceCategory();
