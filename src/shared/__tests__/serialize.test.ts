import { describe, it, expect } from "vitest";
import { Types } from "mongoose";
import { serialize } from "@/shared/serialize";
import { toDecimal128 } from "@/lib/money";

describe("serialize", () => {
  it("converts Decimal128 to a string", () => {
    const out = serialize({ total: toDecimal128("95000") });
    expect(out.total).toBe("95000.00");
    expect(typeof out.total).toBe("string");
  });

  it("handles nested money objects and arrays", () => {
    const out = serialize({
      items: [{ amount: toDecimal128("15000"), currency: "BDT" }],
      total: { amount: toDecimal128("45000.5"), currency: "BDT" },
    });
    expect(out.items[0].amount).toBe("15000.00");
    expect(out.total.amount).toBe("45000.50");
    expect(out.total.currency).toBe("BDT");
  });

  it("leaves ObjectId and Date intact", () => {
    const id = new Types.ObjectId();
    const date = new Date("2026-09-10T00:00:00.000Z");
    const out = serialize({ _id: id, createdAt: date });
    expect(out._id).toBe(id);
    expect(out.createdAt).toBe(date);
  });

  it("passes primitives through", () => {
    expect(serialize(5)).toBe(5);
    expect(serialize("x")).toBe("x");
    expect(serialize(null)).toBe(null);
  });
});
