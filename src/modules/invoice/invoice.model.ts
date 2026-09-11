import { Schema, model } from "mongoose";
import { IInvoice, IInvoiceLine } from "./invoice.interface";
import { schemaOptions } from "@/utils/schemaOptions";
import { moneyField } from "@/utils/moneySchema";
import { DEFAULT_CURRENCY } from "@/lib/money";
import { INVOICE_STATUS } from "./invoice.enum";

const lineSchema = new Schema<IInvoiceLine>(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1, min: 0 },
    unit_price: moneyField(),
    amount: moneyField(),
    service: { type: Schema.Types.ObjectId, ref: "Service", default: null },
  },
  { _id: false }
);

const invoiceSchema = new Schema<IInvoice>(
  {
    invoice_number: { type: String, required: true, unique: true, trim: true },
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    contract: { type: Schema.Types.ObjectId, ref: "Contract", default: null },
    project: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    recurring_schedule: {
      type: Schema.Types.ObjectId,
      ref: "RecurringBilling",
      default: null,
    },
    lines: { type: [lineSchema], default: [] },
    issue_date: { type: Date, default: () => new Date() },
    due_date: { type: Date, default: () => new Date() },
    billing_period_start: { type: Date, default: null },
    billing_period_end: { type: Date, default: null },
    currency: { type: String, default: DEFAULT_CURRENCY },
    subtotal: moneyField(),
    discount: moneyField(),
    tax: moneyField(),
    total: moneyField(),
    amount_paid: moneyField(),
    amount_due: moneyField(),
    status: {
      type: String,
      enum: Object.values(INVOICE_STATUS),
      default: INVOICE_STATUS.DRAFT,
    },
    notes: { type: String, default: "" },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    is_Deleted: { type: Boolean, default: false },
  },
  schemaOptions
);

invoiceSchema.index({ client: 1 });
invoiceSchema.index({ contract: 1 });
invoiceSchema.index({ project: 1 });
invoiceSchema.index({ recurring_schedule: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ due_date: 1 });
invoiceSchema.index({ created_by: 1 });

export const InvoiceModel = model<IInvoice>("Invoice", invoiceSchema);
