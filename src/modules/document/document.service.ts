import ApiError from "@/middlewares/error";
import { HttpStatusCode } from "@/lib/httpStatus";
import { DocumentModel } from "./document.model";
import { uploadBuffer, deleteObject, isStorageConfigured } from "@/lib/storage";
import { IAuthUser } from "@/lib/rbac";
import { paginationHelpers } from "@/helpers/paginationHelpers";
import { IPaginationOptions } from "@/interfaces/pagination.interfaces";

const populateRefs = [{ path: "uploaded_by", select: "name email" }];

class Documents {
  async upload(
    file: Express.Multer.File | undefined,
    data: Record<string, unknown>,
    user: IAuthUser
  ) {
    if (!file) throw new ApiError(HttpStatusCode.BAD_REQUEST, "No file uploaded.");
    if (!isStorageConfigured())
      throw new ApiError(
        HttpStatusCode.NOT_IMPLEMENTED,
        "File storage (S3) is not configured."
      );
    const { key, url } = await uploadBuffer(
      file.buffer,
      file.mimetype,
      "documents",
      file.originalname
    );
    const doc = await DocumentModel.create({
      name: (data.name as string) || file.originalname,
      key,
      url,
      mime: file.mimetype,
      size: file.size,
      entity_type: data.entity_type || null,
      entity_id: data.entity_id || null,
      uploaded_by: user.id,
    });
    return DocumentModel.findById(doc._id).populate(populateRefs);
  }

  async list(
    options: IPaginationOptions,
    filters: { entity_type?: string; entity_id?: string; search?: string }
  ) {
    const { page, limit, skip } = paginationHelpers.calculatePagination(options);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cond: any = { is_Deleted: false };
    if (filters.entity_type) cond.entity_type = filters.entity_type;
    if (filters.entity_id) cond.entity_id = filters.entity_id;
    if (filters.search) cond.name = { $regex: filters.search, $options: "i" };

    const [data, total] = await Promise.all([
      DocumentModel.find(cond)
        .populate(populateRefs)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DocumentModel.countDocuments(cond),
    ]);
    return { meta: { page, limit, total }, data };
  }

  async remove(id: string) {
    const doc = await DocumentModel.findOne({ _id: id, is_Deleted: false });
    if (!doc) throw new ApiError(HttpStatusCode.NOT_FOUND, "Document not found.");
    await deleteObject(doc.key);
    await DocumentModel.findByIdAndUpdate(id, { is_Deleted: true });
    return doc;
  }
}

export const DocumentService = new Documents();
