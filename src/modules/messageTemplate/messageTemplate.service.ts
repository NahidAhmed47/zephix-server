import ApiError from "@/middlewares/error";
import { HttpStatusCode } from "@/lib/httpStatus";
import { MessageTemplateModel } from "./messageTemplate.model";
import { COMMUNICATION_TYPE } from "@/modules/communicationLog/communicationLog.enum";
import { extractVariables } from "@/lib/templateEngine";
import { IAuthUser } from "@/lib/rbac";
import { paginationHelpers } from "@/helpers/paginationHelpers";
import { IPaginationOptions } from "@/interfaces/pagination.interfaces";

class MessageTemplate {
  private vars(subject?: string, body?: string): string[] {
    return [
      ...new Set([
        ...extractVariables(subject || ""),
        ...extractVariables(body || ""),
      ]),
    ];
  }

  async create(data: Record<string, unknown>, user: IAuthUser) {
    return MessageTemplateModel.create({
      name: data.name,
      type: data.type || COMMUNICATION_TYPE.SMS,
      subject: data.subject || "",
      body: data.body || "",
      variables: this.vars(data.subject as string, data.body as string),
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
      created_by: user.id,
    });
  }

  async list(
    options: IPaginationOptions,
    filters: { type?: string; active?: string; search?: string }
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      paginationHelpers.calculatePagination(options);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cond: any = { is_Deleted: false };
    if (filters.type) cond.type = filters.type;
    if (filters.active === "true") cond.is_active = true;
    if (filters.active === "false") cond.is_active = false;
    if (filters.search) cond.name = { $regex: filters.search, $options: "i" };

    const [data, total] = await Promise.all([
      MessageTemplateModel.find(cond)
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MessageTemplateModel.countDocuments(cond),
    ]);
    return { meta: { page, limit, total }, data };
  }

  async getById(id: string) {
    const doc = await MessageTemplateModel.findOne({
      _id: id,
      is_Deleted: false,
    });
    if (!doc) throw new ApiError(HttpStatusCode.NOT_FOUND, "Template not found.");
    return doc;
  }

  async update(id: string, data: Record<string, unknown>) {
    const before = await MessageTemplateModel.findOne({
      _id: id,
      is_Deleted: false,
    });
    if (!before)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Template not found.");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = { ...data };
    if (data.subject !== undefined || data.body !== undefined) {
      const subject =
        data.subject !== undefined ? (data.subject as string) : before.subject;
      const body = data.body !== undefined ? (data.body as string) : before.body;
      patch.variables = this.vars(subject, body);
    }
    const updated = await MessageTemplateModel.findByIdAndUpdate(id, patch, {
      new: true,
    });
    return { updated, before: before.toObject() };
  }

  async remove(id: string) {
    const doc = await MessageTemplateModel.findOne({
      _id: id,
      is_Deleted: false,
    });
    if (!doc) throw new ApiError(HttpStatusCode.NOT_FOUND, "Template not found.");
    await MessageTemplateModel.findByIdAndUpdate(id, { is_Deleted: true });
    return doc;
  }
}

export const MessageTemplateService = new MessageTemplate();
