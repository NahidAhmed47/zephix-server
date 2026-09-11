import { Schema, model } from "mongoose";
import { IRecurringBilling } from "./recurringBilling.interface";
import { schemaOptions } from "@/utils/schemaOptions";
import { moneyField } from "@/utils/moneySchema";
import { DEFAULT_CURRENCY } from "@/lib/money";
import { BILLING_FREQUENCY } from "@/lib/billing";
import { RECURRING_STATUS } from "./recurringBilling.enum";
import { MESSAGING_PREF } from "@/modules/client/client.enum";

const messagingField = () => ({
  sms: {
    type: String,
    enum: Object.values(MESSAGING_PREF),
    default: MESSAGING_PREF.INHERIT,
  },
  email: {
    type: String,
    enum: Object.values(MESSAGING_PREF),
    default: MESSAGING_PREF.INHERIT,
  },
});

const recurringBillingSchema = new Schema<IRecurringBilling>(
  {
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    contract: { type: Schema.Types.ObjectId, ref: "Contract", default: null },
    service: { type: Schema.Types.ObjectId, ref: "Service", default: null },
    project: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    amount: moneyField(),
    currency: { type: String, default: DEFAULT_CURRENCY },
    frequency: {
      type: String,
      enum: Object.values(BILLING_FREQUENCY),
      default: BILLING_FREQUENCY.MONTHLY,
    },
    custom_months: { type: Number, default: 1, min: 1 },
    start_date: { type: Date, default: () => new Date() },
    end_date: { type: Date, default: null },
    next_billing_date: { type: Date, default: () => new Date() },
    previous_billing_date: { type: Date, default: null },
    auto_invoice: { type: Boolean, default: true },
    messaging: messagingField(),
    mrr_value: moneyField(),
    status: {
      type: String,
      enum: Object.values(RECURRING_STATUS),
      default: RECURRING_STATUS.ACTIVE,
    },
    description: { type: String, default: "" },
    notes: { type: String, default: "" },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    is_Deleted: { type: Boolean, default: false },
  },
  schemaOptions
);

recurringBillingSchema.index({ client: 1 });
recurringBillingSchema.index({ contract: 1 });
recurringBillingSchema.index({ status: 1 });
recurringBillingSchema.index({ next_billing_date: 1 });
recurringBillingSchema.index({ created_by: 1 });

export const RecurringBillingModel = model<IRecurringBilling>(
  "RecurringBilling",
  recurringBillingSchema
);
