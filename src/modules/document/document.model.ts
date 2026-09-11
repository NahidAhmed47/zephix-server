import { Schema, model } from "mongoose";
import { IDocument } from "./document.interface";
import { schemaOptions } from "@/utils/schemaOptions";
import { DOCUMENT_ENTITY } from "./document.enum";

const documentSchema = new Schema<IDocument>(
  {
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true },
    url: { type: String, default: "" },
    mime: { type: String, default: "" },
    size: { type: Number, default: 0 },
    entity_type: {
      type: String,
      enum: [...Object.values(DOCUMENT_ENTITY), null],
      default: null,
    },
    entity_id: { type: Schema.Types.ObjectId, default: null },
    uploaded_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    is_Deleted: { type: Boolean, default: false },
  },
  schemaOptions
);

documentSchema.index({ entity_type: 1, entity_id: 1 });
documentSchema.index({ createdAt: -1 });

export const DocumentModel = model<IDocument>("Document", documentSchema);
