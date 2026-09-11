import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import {
  intervalMonths,
  addInterval,
  nextBillingDate,
  monthlyFactor,
  occurrencesPerYear,
  mrrOf,
  arrOf,
} from "@/lib/billing";
import { money, decimal128ToString } from "@/lib/money";

const iso = (d: Date) => DateTime.fromJSDate(d).toISODate();

describe("billing intervalMonths", () => {
  it("maps fixed frequencies", () => {
    expect(intervalMonths("monthly")).toBe(1);
    expect(intervalMonths("quarterly")).toBe(3);
    expect(intervalMonths("half_yearly")).toBe(6);
    expect(intervalMonths("yearly")).toBe(12);
  });
  it("uses customMonths for custom (min 1)", () => {
    expect(intervalMonths("custom", 2)).toBe(2);
    expect(intervalMonths("custom", 0)).toBe(1);
    expect(intervalMonths("custom")).toBe(1);
  });
});

describe("addInterval — end-of-month + leap year (spec §13)", () => {
  it("Jan 31 + monthly clamps to Feb 28 in a non-leap year", () => {
    expect(iso(addInterval(new Date(2026, 0, 31), "monthly"))).toBe(
      "2026-02-28"
    );
  });
  it("Jan 31 + monthly clamps to Feb 29 in a leap year", () => {
    expect(iso(addInterval(new Date(2028, 0, 31), "monthly"))).toBe(
      "2028-02-29"
    );
  });
  it("quarterly and yearly advance correctly", () => {
    expect(iso(addInterval(new Date(2026, 0, 15), "quarterly"))).toBe(
      "2026-04-15"
    );
    expect(iso(addInterval(new Date(2026, 0, 15), "yearly"))).toBe(
      "2027-01-15"
    );
  });
  it("custom interval of N months", () => {
    expect(iso(addInterval(new Date(2026, 0, 15), "custom", 2))).toBe(
      "2026-03-15"
    );
  });
});

describe("nextBillingDate", () => {
  it("returns the first interval strictly after `after`", () => {
    const next = nextBillingDate(
      new Date(2026, 0, 10),
      "monthly",
      1,
      new Date(2026, 2, 15)
    );
    expect(iso(next)).toBe("2026-04-10");
  });
  it("preserves end-of-month across the roll", () => {
    const next = nextBillingDate(
      new Date(2026, 0, 31),
      "monthly",
      1,
      new Date(2026, 1, 10)
    );
    expect(iso(next)).toBe("2026-02-28");
  });
  it("returns the anchor when it is already in the future", () => {
    const next = nextBillingDate(
      new Date(2026, 5, 1),
      "monthly",
      1,
      new Date(2026, 0, 1)
    );
    expect(iso(next)).toBe("2026-06-01");
  });
});

describe("MRR / ARR normalization (spec §31)", () => {
  it("monthlyFactor + occurrencesPerYear", () => {
    expect(monthlyFactor("yearly")).toBeCloseTo(1 / 12);
    expect(occurrencesPerYear("quarterly")).toBe(4);
  });
  it("yearly 120,000 → MRR 10,000", () => {
    expect(decimal128ToString(mrrOf(money(120000), "yearly").amount)).toBe(
      "10000.00"
    );
  });
  it("quarterly 60,000 → MRR 20,000", () => {
    expect(decimal128ToString(mrrOf(money(60000), "quarterly").amount)).toBe(
      "20000.00"
    );
  });
  it("monthly 10,000 → ARR 120,000", () => {
    expect(decimal128ToString(arrOf(money(10000), "monthly").amount)).toBe(
      "120000.00"
    );
  });
});
