import { describe, it, expect } from "vitest";
import {
  addMoney,
  compareMoney,
  formatMoney,
  money,
  mulMoney,
  subMoney,
  sumMoney,
  toMinor,
  fromMinor,
  decimal128ToString,
} from "../money";

describe("money util", () => {
  it("parses and renders minor units exactly", () => {
    expect(toMinor("95000.00")).toBe(9500000n);
    expect(toMinor(95000)).toBe(9500000n);
    expect(fromMinor(9500000n)).toBe("95000.00");
    expect(toMinor("10.005")).toBe(1001n); // half-up
  });

  it("stores as Decimal128 with 2dp", () => {
    expect(decimal128ToString(money(95000).amount)).toBe("95000.00");
  });

  it("adds and subtracts without float drift", () => {
    const a = money("0.1");
    const b = money("0.2");
    expect(decimal128ToString(addMoney(a, b).amount)).toBe("0.30");
  });

  it("computes partial payment remaining exactly (spec §15)", () => {
    const invoice = money(300000);
    const p1 = money(100000);
    const p2 = money(80000);
    const remaining = subMoney(invoice, sumMoney([p1, p2]));
    expect(decimal128ToString(remaining.amount)).toBe("120000.00");
  });

  it("multiplies line item by quantity", () => {
    expect(decimal128ToString(mulMoney(money("15000"), 3).amount)).toBe("45000.00");
  });

  it("rejects currency mismatch", () => {
    expect(() => addMoney(money(10, "BDT"), money(10, "USD"))).toThrow(
      /Currency mismatch/
    );
  });

  it("compares amounts", () => {
    expect(compareMoney(money(120000), money(80000))).toBe(1);
    expect(compareMoney(money(80000), money(80000))).toBe(0);
  });

  it("formats BDT with grouping and symbol", () => {
    expect(formatMoney(money(1250000))).toBe("৳ 1,250,000.00");
    expect(formatMoney(money(850000), { withDecimals: false })).toBe("৳ 850,000");
  });
});
