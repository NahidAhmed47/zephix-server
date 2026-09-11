import { Schema, model } from "mongoose";
import { IContract, IContractService } from "./contract.interface";
import { schemaOptions } from "@/utils/schemaOptions";
import { moneyField } from "@/utils/moneySchema";
import { DEFAULT_CURRENCY } from "@/lib/money";
import { CONTRACT_STATUS } from "./contract.enum";
import { PRICING_MODEL } from "@/modules/service/service.enum";
import { MESSAGING_PREF } from "@/modules/client/client.enum";

/** Reusable 3-state messaging override (on/off/inherit) — spec §22/§23. */
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

const contractServiceSchema = new Schema<IContractService>(
  {
    contract: { type: Schema.Types.ObjectId, ref: "Contract", required: true },
    service: { type: Schema.Types.ObjectId, ref: "Service", default: null },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    pricing_model: {
      type: String,
      enum: Object.values(PRICING_MODEL),
      default: PRICING_MODEL.FIXED,
    },
    price: moneyField(),
    quantity: { type: Number, default: 1, min: 0 },
    line_total: moneyField(),
    start_date: { type: Date, default: null },
    end_date: { type: Date, default: null },
    messaging: messagingField(),
    is_Deleted: { type: Boolean, default: false },
  },
  schemaOptions
);

contractServiceSchema.index({ contract: 1 });
contractServiceSchema.index({ service: 1 });

export const ContractServiceModel = model<IContractService>(
  "ContractService",
  contractServiceSchema
);

const contractSchema = new Schema<IContract>(
  {
    contract_number: { type: String, required: true, unique: true, trim: true },
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: Object.values(CONTRACT_STATUS),
      default: CONTRACT_STATUS.DRAFT,
    },
    start_date: { type: Date, default: null },
    end_date: { type: Date, default: null },
    renewal_date: { type: Date, default: null },
    currency: { type: String, default: DEFAULT_CURRENCY },
    total_value: moneyField(),
    mrr_value: moneyField(),
    payment_terms_days: { type: Number, default: 0, min: 0 },
    account_manager: { type: Schema.Types.ObjectId, ref: "User", default: null },
    messaging: messagingField(),
    notes: { type: String, default: "" },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    is_Deleted: { type: Boolean, default: false },
  },
  schemaOptions
);

contractSchema.index({ client: 1 });
contractSchema.index({ status: 1 });
contractSchema.index({ end_date: 1 });
contractSchema.index({ renewal_date: 1 });
contractSchema.index({ account_manager: 1 });
contractSchema.index({ created_by: 1 });

export const ContractModel = model<IContract>("Contract", contractSchema);
