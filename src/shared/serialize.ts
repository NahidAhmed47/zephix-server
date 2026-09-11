import { Types } from "mongoose";

/**
 * Recursively converts a Mongoose result into clean JSON:
 *  - Decimal128 → string (so the API never leaks `{ "$numberDecimal": ... }`)
 *  - ObjectId / Date / Buffer are left intact (res.json already serializes them)
 * Applied centrally in BaseController.sendResponse so every money-bearing
 * response is safe without per-field mapping.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const serialize = (value: any): any => {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;

  // Decimal128 → exact string
  if (value instanceof Types.Decimal128 || value?._bsontype === "Decimal128") {
    return value.toString();
  }

  // leave these for the default JSON serializer (ObjectId → hex, Date → ISO)
  if (
    value instanceof Types.ObjectId ||
    value?._bsontype === "ObjectID" ||
    value?._bsontype === "ObjectId" ||
    value instanceof Date ||
    Buffer.isBuffer(value)
  ) {
    return value;
  }

  if (Array.isArray(value)) return value.map(serialize);

  // mongoose document → plain object, then recurse
  const source =
    typeof value.toObject === "function" ? value.toObject() : value;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any = {};
  for (const key of Object.keys(source)) {
    out[key] = serialize(source[key]);
  }
  return out;
};
