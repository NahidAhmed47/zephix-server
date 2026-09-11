import { Types } from "mongoose";
import { TDocumentEntity } from "./document.enum";

export interface IDocument {
  _id?: string;
  name: string;
  key: string; // S3 object key
  url: string;
  mime: string;
  size: number;
  entity_type?: TDocumentEntity | null;
  entity_id?: Types.ObjectId | string | null;
  uploaded_by?: Types.ObjectId | string;
  is_Deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
