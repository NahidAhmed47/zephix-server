import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuid } from "uuid";
import { envConfig } from "@/config";

/**
 * S3 object storage for documents (spec §38). Fails loudly with a clear message
 * when unconfigured so callers can surface it; never leaks credentials.
 */

const enabled = (): boolean =>
  !!(envConfig.aws.bucket_name && envConfig.aws.access_key_id);

let client: S3Client | null = null;
const s3 = (): S3Client => {
  if (!client)
    client = new S3Client({
      region: envConfig.aws.region,
      credentials: {
        accessKeyId: envConfig.aws.access_key_id,
        secretAccessKey: envConfig.aws.secret_access_key,
      },
    });
  return client;
};

export const isStorageConfigured = (): boolean => enabled();

export const uploadBuffer = async (
  buffer: Buffer,
  mime: string,
  folder = "documents",
  filename?: string
): Promise<{ key: string; url: string }> => {
  if (!enabled()) throw new Error("File storage (S3) is not configured.");
  const ext =
    filename && filename.includes(".") ? `.${filename.split(".").pop()}` : "";
  const key = `${folder}/${uuid()}${ext}`;
  await s3().send(
    new PutObjectCommand({
      Bucket: envConfig.aws.bucket_name,
      Key: key,
      Body: buffer,
      ContentType: mime,
    })
  );
  const base = (envConfig.aws.file_load_base_url || "").replace(/\/$/, "");
  const url = base
    ? `${base}/${key}`
    : `https://${envConfig.aws.bucket_name}.s3.${envConfig.aws.region}.amazonaws.com/${key}`;
  return { key, url };
};

export const deleteObject = async (key: string): Promise<void> => {
  if (!enabled() || !key) return;
  try {
    await s3().send(
      new DeleteObjectCommand({
        Bucket: envConfig.aws.bucket_name,
        Key: key,
      })
    );
  } catch (e) {
    console.error("[storage] delete failed:", (e as Error).message);
  }
};
