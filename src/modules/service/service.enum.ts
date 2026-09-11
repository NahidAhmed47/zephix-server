/**
 * Pricing models a catalog service can use (spec §8). The recurring cadences
 * (monthly…yearly) are what drive MRR/ARR and the recurring-billing engine in
 * Phase 4, so they are first-class values rather than free text.
 */
export const PRICING_MODEL = {
  FIXED: "fixed",
  HOURLY: "hourly",
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  HALF_YEARLY: "half_yearly", // "6 Monthly" in the spec
  YEARLY: "yearly",
  MILESTONE: "milestone",
  CUSTOM: "custom",
} as const;

export type TPricingModel = (typeof PRICING_MODEL)[keyof typeof PRICING_MODEL];

/** Pricing models that represent recurring revenue (used for MRR/ARR later). */
export const RECURRING_PRICING_MODELS: string[] = [
  PRICING_MODEL.MONTHLY,
  PRICING_MODEL.QUARTERLY,
  PRICING_MODEL.HALF_YEARLY,
  PRICING_MODEL.YEARLY,
];

/** Months per recurring cadence — the basis for MRR normalization (spec §31). */
export const PRICING_MODEL_MONTHS: Record<string, number> = {
  [PRICING_MODEL.MONTHLY]: 1,
  [PRICING_MODEL.QUARTERLY]: 3,
  [PRICING_MODEL.HALF_YEARLY]: 6,
  [PRICING_MODEL.YEARLY]: 12,
};
