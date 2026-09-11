import ApiError from "@/middlewares/error";
import { HttpStatusCode } from "@/lib/httpStatus";
import { ReminderRuleModel } from "./reminderRule.model";
import { IReminderRule } from "./reminderRule.interface";
import { IAuthUser } from "@/lib/rbac";
import { paginationHelpers } from "@/helpers/paginationHelpers";
import { IPaginationOptions } from "@/interfaces/pagination.interfaces";

const populateRefs = [
  { path: "sms_template", select: "name type" },
  { path: "email_template", select: "name type" },
];

class ReminderRule {
  async create(data: Record<string, unknown>, user: IAuthUser) {
    const doc = await ReminderRuleModel.create({
      name: data.name,
      offset_days: Number(data.offset_days ?? 0),
      sms_enabled: Boolean(data.sms_enabled),
      email_enabled:
        data.email_enabled !== undefined ? Boolean(data.email_enabled) : true,
      sms_template: data.sms_template || null,
      email_template: data.email_template || null,
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
      created_by: user.id,
    });
    return ReminderRuleModel.findById(doc._id).populate(populateRefs);
  }

  async list(options: IPaginationOptions, filters: { active?: string }) {
    const { page, limit, skip, sortBy, sortOrder } =
      paginationHelpers.calculatePagination(options);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cond: any = { is_Deleted: false };
    if (filters.active === "true") cond.is_active = true;
    if (filters.active === "false") cond.is_active = false;

    const [data, total] = await Promise.all([
      ReminderRuleModel.find(cond)
        .populate(populateRefs)
        .sort({ [sortBy === "createdAt" ? "offset_days" : sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ReminderRuleModel.countDocuments(cond),
    ]);
    return { meta: { page, limit, total }, data };
  }

  /** Active rules for the reminder engine (lean, populated with templates). */
  async listActive(): Promise<IReminderRule[]> {
    return ReminderRuleModel.find({ is_Deleted: false, is_active: true })
      .populate(populateRefs)
      .lean();
  }

  async getById(id: string) {
    const doc = await ReminderRuleModel.findOne({
      _id: id,
      is_Deleted: false,
    }).populate(populateRefs);
    if (!doc) throw new ApiError(HttpStatusCode.NOT_FOUND, "Rule not found.");
    return doc;
  }

  async update(id: string, data: Record<string, unknown>) {
    const before = await ReminderRuleModel.findOne({
      _id: id,
      is_Deleted: false,
    });
    if (!before) throw new ApiError(HttpStatusCode.NOT_FOUND, "Rule not found.");
    const updated = await ReminderRuleModel.findByIdAndUpdate(id, data, {
      new: true,
    }).populate(populateRefs);
    return { updated, before: before.toObject() };
  }

  async remove(id: string) {
    const doc = await ReminderRuleModel.findOne({ _id: id, is_Deleted: false });
    if (!doc) throw new ApiError(HttpStatusCode.NOT_FOUND, "Rule not found.");
    await ReminderRuleModel.findByIdAndUpdate(id, { is_Deleted: true });
    return doc;
  }
}

export const ReminderRuleService = new ReminderRule();
