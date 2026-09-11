import { Schema, model } from "mongoose";
import { IContact } from "./contact.interface";
import { schemaOptions } from "@/utils/schemaOptions";

const contactSchema = new Schema<IContact>(
  {
    client: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    designation: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    whatsapp: { type: String, default: "" },
    is_primary: { type: Boolean, default: false },
    is_billing: { type: Boolean, default: false },
    is_project: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    notes: { type: String, default: "" },
    is_Deleted: { type: Boolean, default: false },
  },
  schemaOptions
);

contactSchema.index({ client: 1 });
contactSchema.index({ client: 1, is_primary: 1 });

export const ContactModel = model<IContact>("Contact", contactSchema);
