import { Schema, model } from "mongoose";
import { IDeal } from "./deal.interface";
import { schemaOptions } from "@/utils/schemaOptions";
import { moneyField } from "@/utils/moneySchema";
import { DEAL_STAGE } from "./deal.enum";

const dealSchema = new Schema<IDeal>(
  {
    name: { type: String, required: true, trim: true },
    client: { type: Schema.Types.ObjectId, ref: "Client", default: null },
    lead_name: { type: String, default: "" },
    service: { type: Schema.Types.ObjectId, ref: "Service", default: null },
    expected_value: moneyField(),
    probability: { type: Number, default: 0, min: 0, max: 100 },
    weighted_value: moneyField(),
    expected_close_date: { type: Date, default: null },
    stage: {
      type: String,
      enum: Object.values(DEAL_STAGE),
      default: DEAL_STAGE.LEAD,
    },
    owner: { type: Schema.Types.ObjectId, ref: "User", default: null },
    notes: { type: String, default: "" },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    is_Deleted: { type: Boolean, default: false },
  },
  schemaOptions
);

dealSchema.index({ stage: 1 });
dealSchema.index({ owner: 1 });
dealSchema.index({ client: 1 });
dealSchema.index({ expected_close_date: 1 });

export const DealModel = model<IDeal>("Deal", dealSchema);
