import ApiError from "@/middlewares/error";
import { HttpStatusCode } from "@/lib/httpStatus";
import { ContactModel } from "./contact.model";
import { ClientService } from "@/modules/client/client.service";
import { IAuthUser } from "@/lib/rbac";
import { paginationHelpers } from "@/helpers/paginationHelpers";
import { IPaginationOptions } from "@/interfaces/pagination.interfaces";

const clientPopulate = { path: "client", select: "name" } as const;

class Service {
  async create(data: Record<string, unknown>, user: IAuthUser) {
    await ClientService.assertAccess(String(data.client), user);
    if (data.is_primary) {
      await ContactModel.updateMany(
        { client: data.client, is_primary: true, is_Deleted: false },
        { is_primary: false }
      );
    }
    const doc = await ContactModel.create(data);
    return ContactModel.findById(doc._id).populate(clientPopulate);
  }

  async list(
    options: IPaginationOptions,
    filters: { client?: string; search?: string; status?: string },
    user: IAuthUser
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      paginationHelpers.calculatePagination(options);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cond: any = { is_Deleted: false };

    if (filters.client) {
      await ClientService.assertAccess(filters.client, user);
      cond.client = filters.client;
    } else {
      const ids = await ClientService.accessibleClientIds(user);
      if (ids) cond.client = { $in: ids };
    }
    if (filters.status) cond.status = filters.status;
    if (filters.search) {
      cond.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { email: { $regex: filters.search, $options: "i" } },
        { designation: { $regex: filters.search, $options: "i" } },
      ];
    }

    const [data, total] = await Promise.all([
      ContactModel.find(cond)
        .populate(clientPopulate)
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ContactModel.countDocuments(cond),
    ]);
    return { meta: { page, limit, total }, data };
  }

  async getById(id: string, user: IAuthUser) {
    const contact = await ContactModel.findOne({
      _id: id,
      is_Deleted: false,
    }).populate(clientPopulate);
    if (!contact) throw new ApiError(HttpStatusCode.NOT_FOUND, "Contact not found.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientId = (contact.client as any)?._id || contact.client;
    await ClientService.assertAccess(String(clientId), user);
    return contact;
  }

  async update(id: string, data: Record<string, unknown>, user: IAuthUser) {
    const contact = await this.getById(id, user);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientId = (contact.client as any)?._id || contact.client;
    if (data.is_primary) {
      await ContactModel.updateMany(
        { client: clientId, _id: { $ne: id }, is_primary: true, is_Deleted: false },
        { is_primary: false }
      );
    }
    const updated = await ContactModel.findByIdAndUpdate(id, data, {
      new: true,
    }).populate(clientPopulate);
    return { updated, before: contact.toObject() };
  }

  async remove(id: string, user: IAuthUser) {
    const contact = await this.getById(id, user);
    await ContactModel.findByIdAndUpdate(id, { is_Deleted: true });
    return contact;
  }
}

export const ContactService = new Service();
