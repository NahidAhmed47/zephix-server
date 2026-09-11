import { CommunicationLogModel } from "./communicationLog.model";
import { ICommunicationLog } from "./communicationLog.interface";
import { SENT_STATUSES } from "./communicationLog.enum";
import { paginationHelpers } from "@/helpers/paginationHelpers";
import { IPaginationOptions } from "@/interfaces/pagination.interfaces";

const populateRefs = [
  { path: "client", select: "name" },
  { path: "invoice", select: "invoice_number" },
  { path: "template", select: "name type" },
];

class CommunicationLog {
  /** Append a log entry. Never throws — logging must not break the operation it
   *  records (spec §26/§59). */
  async log(input: Partial<ICommunicationLog>): Promise<ICommunicationLog | null> {
    try {
      return await CommunicationLogModel.create(input);
    } catch (error) {
      console.error(
        "[comm-log] failed to write:",
        (error as Error).message
      );
      return null;
    }
  }

  /** Idempotency guard for reminders (spec §27): has this reminder already
   *  been sent successfully? */
  async wasReminderSent(reminderKey: string): Promise<boolean> {
    if (!reminderKey) return false;
    const existing = await CommunicationLogModel.findOne({
      reminder_key: reminderKey,
      status: { $in: SENT_STATUSES },
    }).select("_id");
    return !!existing;
  }

  async list(
    options: IPaginationOptions,
    filters: {
      client?: string;
      invoice?: string;
      type?: string;
      status?: string;
      search?: string;
    }
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      paginationHelpers.calculatePagination(options);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cond: any = {};
    if (filters.client) cond.client = filters.client;
    if (filters.invoice) cond.invoice = filters.invoice;
    if (filters.type) cond.type = filters.type;
    if (filters.status) cond.status = filters.status;
    if (filters.search)
      cond.recipient = { $regex: filters.search, $options: "i" };

    const [data, total] = await Promise.all([
      CommunicationLogModel.find(cond)
        .populate(populateRefs)
        .sort({ [sortBy === "createdAt" ? "sent_at" : sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CommunicationLogModel.countDocuments(cond),
    ]);
    return { meta: { page, limit, total }, data };
  }
}

export const CommunicationLogService = new CommunicationLog();
