import { NotificationModel } from "./notification.model";
import { INotification } from "./notification.interface";
import { NOTIFICATION_TYPE } from "./notification.enum";
import { ContractModel } from "@/modules/contract/contract.model";
import { LIVE_CONTRACT_STATUSES } from "@/modules/contract/contract.enum";
import { IAuthUser } from "@/lib/rbac";
import { paginationHelpers } from "@/helpers/paginationHelpers";
import { IPaginationOptions } from "@/interfaces/pagination.interfaces";

class Notification {
  /** Create a notification. Dedups on (user + link) while still unread so
   *  repeated cron runs don't spam the same alert (§64). Never throws. */
  async notify(input: Partial<INotification>): Promise<void> {
    try {
      if (input.link) {
        const dup = await NotificationModel.findOne({
          user: input.user,
          link: input.link,
          is_read: false,
        }).select("_id");
        if (dup) return;
      }
      await NotificationModel.create(input);
    } catch (error) {
      console.error("[notification] failed:", (error as Error).message);
    }
  }

  async list(user: IAuthUser, options: IPaginationOptions) {
    const { page, limit, skip } = paginationHelpers.calculatePagination(options);
    const cond = { user: user.id };
    const [data, total, unread] = await Promise.all([
      NotificationModel.find(cond)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NotificationModel.countDocuments(cond),
      NotificationModel.countDocuments({ user: user.id, is_read: false }),
    ]);
    return { meta: { page, limit, total }, data, unread };
  }

  async unreadCount(user: IAuthUser) {
    const count = await NotificationModel.countDocuments({
      user: user.id,
      is_read: false,
    });
    return { unread: count };
  }

  async markRead(id: string, user: IAuthUser) {
    await NotificationModel.findOneAndUpdate(
      { _id: id, user: user.id },
      { is_read: true }
    );
    return this.unreadCount(user);
  }

  async markAllRead(user: IAuthUser) {
    await NotificationModel.updateMany(
      { user: user.id, is_read: false },
      { is_read: true }
    );
    return { unread: 0 };
  }

  /** System alerts for contracts renewing within 7 days → the account manager
   *  (cron, §64). Deduped by notify(). Error-tolerant. */
  async generateAlerts(now: Date = new Date()) {
    const in7 = new Date(now.getTime() + 7 * 86400000);
    const contracts = await ContractModel.find({
      is_Deleted: false,
      status: { $in: LIVE_CONTRACT_STATUSES },
      account_manager: { $ne: null },
      end_date: { $gte: now, $lte: in7 },
    })
      .select("contract_number account_manager")
      .lean();
    let created = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const c of contracts as any[]) {
      await this.notify({
        user: c.account_manager,
        type: NOTIFICATION_TYPE.CONTRACT_RENEWAL,
        title: `Contract ${c.contract_number} is expiring soon`,
        message: "Review and renew before it lapses.",
        link: `/contracts/${c._id}`,
      });
      created++;
    }
    return { renewal_alerts: created };
  }
}

export const NotificationService = new Notification();
