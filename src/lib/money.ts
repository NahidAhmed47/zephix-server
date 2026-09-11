import { Types } from "mongoose";

/**
 * Money utility — the single source of truth for monetary arithmetic.
 *
 * Rules (see spec §54 + the "currency on every amount" requirement):
 *  - Amounts are stored as MongoDB Decimal128 with an explicit `currency`.
 *  - All arithmetic runs on integer *minor units* (2 dp) via BigInt — never on
 *    floating-point — so partial payments and sums stay exact.
 *  - Formatting happens only at the boundary (never store formatted strings).
 */

export const DEFAULT_CURRENCY = "BDT";
export const MONEY_SCALE = 2;

const FACTOR = 100n; // 10 ** MONEY_SCALE

export interface IMoney {
  amount: Types.Decimal128;
  currency: string;
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  BDT: "৳",
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
};

/** Parse a numeric/string value into integer minor units (2 dp), half-up. */
export function toMinor(value: string | number): bigint {
  const raw = (typeof value === "number" ? value.toFixed(MONEY_SCALE) : value)
    .toString()
    .trim();
  if (raw === "" || raw === "-") return 0n;
  const negative = raw.startsWith("-");
  const unsigned = raw.replace(/^[-+]/, "");
  const [intPart = "0", fracRaw = ""] = unsigned.split(".");
  // half-up rounding on anything beyond MONEY_SCALE
  let frac = fracRaw;
  if (frac.length > MONEY_SCALE) {
    const keep = frac.slice(0, MONEY_SCALE);
    const roundUp = Number(frac[MONEY_SCALE]) >= 5;
    let minor = BigInt(intPart || "0") * FACTOR + BigInt(keep || "0");
    if (roundUp) minor += 1n;
    return negative ? -minor : minor;
  }
  frac = (frac + "00").slice(0, MONEY_SCALE);
  const minor = BigInt(intPart || "0") * FACTOR + BigInt(frac || "0");
  return negative ? -minor : minor;
}

/** Render integer minor units back to a fixed-2dp decimal string. */
export function fromMinor(minor: bigint): string {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const int = abs / FACTOR;
  const frac = (abs % FACTOR).toString().padStart(MONEY_SCALE, "0");
  return `${negative ? "-" : ""}${int.toString()}.${frac}`;
}

export const toDecimal128 = (value: string | number): Types.Decimal128 =>
  Types.Decimal128.fromString(fromMinor(toMinor(value)));

export const decimal128ToString = (d?: Types.Decimal128 | null): string =>
  d ? d.toString() : "0.00";

export const decimal128ToNumber = (d?: Types.Decimal128 | null): number =>
  d ? Number(d.toString()) : 0;

export const money = (
  value: string | number,
  currency: string = DEFAULT_CURRENCY
): IMoney => ({ amount: toDecimal128(value), currency });

export const zeroMoney = (currency: string = DEFAULT_CURRENCY): IMoney =>
  money(0, currency);

const assertSameCurrency = (a: string, b: string): void => {
  if (a !== b) throw new Error(`Currency mismatch: '${a}' vs '${b}'`);
};

const minorOf = (m: IMoney): bigint => toMinor(m.amount.toString());
const fromMinorMoney = (minor: bigint, currency: string): IMoney => ({
  amount: Types.Decimal128.fromString(fromMinor(minor)),
  currency,
});

export const addMoney = (a: IMoney, b: IMoney): IMoney => {
  assertSameCurrency(a.currency, b.currency);
  return fromMinorMoney(minorOf(a) + minorOf(b), a.currency);
};

export const subMoney = (a: IMoney, b: IMoney): IMoney => {
  assertSameCurrency(a.currency, b.currency);
  return fromMinorMoney(minorOf(a) - minorOf(b), a.currency);
};

/** Multiply money by a (possibly fractional) quantity, half-up to 2 dp. */
export const mulMoney = (m: IMoney, qty: number): IMoney => {
  const result = Math.round(Number(minorOf(m)) * qty);
  return fromMinorMoney(BigInt(result), m.currency);
};

export const sumMoney = (
  items: IMoney[],
  currency: string = DEFAULT_CURRENCY
): IMoney => {
  let total = 0n;
  for (const item of items) {
    assertSameCurrency(item.currency, currency);
    total += minorOf(item);
  }
  return fromMinorMoney(total, currency);
};

/** -1 if a<b, 0 if equal, 1 if a>b. */
export const compareMoney = (a: IMoney, b: IMoney): number => {
  assertSameCurrency(a.currency, b.currency);
  const d = minorOf(a) - minorOf(b);
  return d < 0n ? -1 : d > 0n ? 1 : 0;
};

export const isZeroMoney = (m: IMoney): boolean => minorOf(m) === 0n;
export const isNegativeMoney = (m: IMoney): boolean => minorOf(m) < 0n;

const groupThousands = (intStr: string): string =>
  intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Format for display, e.g. "৳ 1,250,000.00" (or without decimals). */
export const formatMoney = (
  m: IMoney,
  opts: { withDecimals?: boolean; withSymbol?: boolean } = {}
): string => {
  const { withDecimals = true, withSymbol = true } = opts;
  const decimal = fromMinor(minorOf(m));
  const negative = decimal.startsWith("-");
  const [intPart, fracPart] = decimal.replace("-", "").split(".");
  const grouped = groupThousands(intPart);
  const body = withDecimals ? `${grouped}.${fracPart}` : grouped;
  const symbol = withSymbol ? `${CURRENCY_SYMBOLS[m.currency] || m.currency} ` : "";
  return `${negative ? "-" : ""}${symbol}${body}`;
};
