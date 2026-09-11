import { Schema } from "mongoose";
import { toDecimal128, DEFAULT_CURRENCY } from "@/lib/money";

/**
 * Reusable embedded money definition: { amount: Decimal128, currency: string }.
 * Returns a fresh object each call so it can be embedded in multiple schemas.
 * Currency is required on every amount (per the project's money rule).
 */
export const moneyField = () => ({
  amount: { type: Schema.Types.Decimal128, default: () => toDecimal128(0) },
  currency: { type: String, default: DEFAULT_CURRENCY },
});
