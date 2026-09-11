import { Schema, model } from "mongoose";
import { IPayment } from "./payment.interface";
import { schemaOptions } from "@/utils/schemaOptions";
import { moneyField } from "@/utils/moneySchema";
import { PAYMENT_METHOD } from "./payment.enum";

const paymentSchema = new Schema<IPayment>(
  {
    payment_number: { type: String, required: true, unique: true, trim: true },
    invoice: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    contract: { type: Schema.Types.ObjectId, ref: "Contract", default: null },
    project: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    amount: moneyField(),
    payment_date: { type: Date, default: () => new Date() },
    method: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      default: PAYMENT_METHOD.BANK,
    },
    transaction_id: { type: String, default: "" },
    reference: { type: String, default: "" },
    received_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    notes: { type: String, default: "" },
    attachment: { type: String, default: "" },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    is_Deleted: { type: Boolean, default: false },
  },
  schemaOptions
);

paymentSchema.index({ invoice: 1 });
paymentSchema.index({ client: 1 });
paymentSchema.index({ payment_date: -1 });
paymentSchema.index({ created_by: 1 });

export const PaymentModel = model<IPayment>("Payment", paymentSchema);
