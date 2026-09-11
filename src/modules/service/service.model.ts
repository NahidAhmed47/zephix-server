import { Schema, model } from "mongoose";
import { IService, IServiceCategory } from "./service.interface";
import { schemaOptions } from "@/utils/schemaOptions";
import { moneyField } from "@/utils/moneySchema";
import { PRICING_MODEL } from "./service.enum";

const serviceCategorySchema = new Schema<IServiceCategory>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    is_active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    is_Deleted: { type: Boolean, default: false },
  },
  schemaOptions
);

serviceCategorySchema.index({ name: 1 });
serviceCategorySchema.index({ is_active: 1 });

export const ServiceCategoryModel = model<IServiceCategory>(
  "ServiceCategory",
  serviceCategorySchema
);

const serviceSchema = new Schema<IService>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, default: "", trim: true },
    description: { type: String, default: "" },
    category: {
      type: Schema.Types.ObjectId,
      ref: "ServiceCategory",
      default: null,
    },
    price: moneyField(),
    pricing_model: {
      type: String,
      enum: Object.values(PRICING_MODEL),
      default: PRICING_MODEL.FIXED,
    },
    estimated_duration_days: { type: Number, default: 0, min: 0 },
    cost: moneyField(),
    unit: { type: String, default: "" },
    tax_rate: { type: Number, default: 0, min: 0, max: 100 },
    is_active: { type: Boolean, default: true },
    notes: { type: String, default: "" },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    is_Deleted: { type: Boolean, default: false },
  },
  schemaOptions
);

serviceSchema.index({ name: 1 });
serviceSchema.index({ code: 1 });
serviceSchema.index({ category: 1 });
serviceSchema.index({ pricing_model: 1 });
serviceSchema.index({ is_active: 1 });

export const ServiceModel = model<IService>("Service", serviceSchema);
