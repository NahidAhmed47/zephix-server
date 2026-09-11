import { describe, it, expect } from "vitest";
import { money, mulMoney, decimal128ToString } from "@/lib/money";

/**
 * Deal weighted value = expected × (probability / 100), computed with the money
 * util (no float drift). Mirrors DealService.weighted().
 */
const weighted = (amount: number, probability: number) =>
  mulMoney(money(amount), probability / 100);

describe("deal weighted value", () => {
  it("500,000 @ 60% = 300,000 (spec §9 example)", () => {
    expect(decimal128ToString(weighted(500000, 60).amount)).toBe("300000.00");
  });

  it("0% and 100% bound correctly", () => {
    expect(decimal128ToString(weighted(120000, 0).amount)).toBe("0.00");
    expect(decimal128ToString(weighted(120000, 100).amount)).toBe("120000.00");
  });

  it("rounds half-up to 2dp", () => {
    // 33,333 @ 33% = 10,999.89
    expect(decimal128ToString(weighted(33333, 33).amount)).toBe("10999.89");
  });
});
