import { DateTime } from "luxon";
import { IMoney, mulMoney } from "@/lib/money";

/**
 * Centralized billing-frequency engine (spec §13). All recurring date math —
 * recurring billing schedules and recurring expenses — goes through here so the
 * rules (end-of-month clamping, leap years, interval length) live in one place
 * and are unit-tested. Never scatter date arithmetic through modules/UI.
 */

export const BILLING_FREQUENCY = {
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  HALF_YEARLY: "half_yearly", // "6 Monthly"
  YEARLY: "yearly",
  CUSTOM: "custom",
} as const;

export type TBillingFrequency =
  (typeof BILLING_FREQUENCY)[keyof typeof BILLING_FREQUENCY];

const FIXED_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  half_yearly: 6,
  yearly: 12,
};

/** Months in one billing interval. CUSTOM uses `customMonths` (min 1). */
export const intervalMonths = (frequency: string, customMonths = 1): number => {
  if (frequency === BILLING_FREQUENCY.CUSTOM)
    return Math.max(1, Math.floor(customMonths || 1));
  return FIXED_MONTHS[frequency] ?? 1;
};

/**
 * Add one billing interval to a date. Luxon clamps overflowing days to the end
 * of the target month, so Jan 31 + 1 month → Feb 28 (Feb 29 in a leap year).
 */
export const addInterval = (
  date: Date,
  frequency: string,
  customMonths = 1
): Date =>
  DateTime.fromJSDate(date)
    .plus({ months: intervalMonths(frequency, customMonths) })
    .toJSDate();

/**
 * The next billing date strictly after `after`, stepping by the interval from
 * `anchor`. If `anchor` is already after `after`, `anchor` is returned. The
 * day-of-month is preserved from the anchor and clamped each step.
 */
export const nextBillingDate = (
  anchor: Date,
  frequency: string,
  customMonths = 1,
  after: Date = new Date()
): Date => {
  const months = intervalMonths(frequency, customMonths);
  const afterDt = DateTime.fromJSDate(after);
  let dt = DateTime.fromJSDate(anchor);
  let guard = 0;
  while (dt <= afterDt && guard < 10000) {
    dt = dt.plus({ months });
    guard++;
  }
  return dt.toJSDate();
};

/** Monthly-normalized factor for MRR, e.g. yearly → 1/12 (spec §31). */
export const monthlyFactor = (frequency: string, customMonths = 1): number =>
  1 / intervalMonths(frequency, customMonths);

/** Billing occurrences per year, e.g. quarterly → 4 (basis for ARR). */
export const occurrencesPerYear = (
  frequency: string,
  customMonths = 1
): number => 12 / intervalMonths(frequency, customMonths);

/** Monthly recurring revenue contribution of a per-interval amount. */
export const mrrOf = (
  amount: IMoney,
  frequency: string,
  customMonths = 1
): IMoney => mulMoney(amount, monthlyFactor(frequency, customMonths));

/** Annual recurring revenue contribution of a per-interval amount. */
export const arrOf = (
  amount: IMoney,
  frequency: string,
  customMonths = 1
): IMoney => mulMoney(amount, occurrencesPerYear(frequency, customMonths));
