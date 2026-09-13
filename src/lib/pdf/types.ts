import { IMoney } from "@/lib/money";

/** Loose shapes for the populated (lean) documents the renderers consume. */

export type PdfAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  district?: string;
  country?: string;
  zip_code?: string;
}

export type PdfClient = {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: PdfAddress;
}

export type PdfRef = {
  name?: string;
  invoice_number?: string;
  contract_number?: string;
}

export type PdfInvoiceLine = {
  description: string;
  quantity: number;
  unit_price: IMoney;
  amount: IMoney;
}

export type PdfInvoice = {
  invoice_number: string;
  client?: PdfClient | string | null;
  contract?: PdfRef | string | null;
  project?: PdfRef | string | null;
  lines: PdfInvoiceLine[];
  issue_date?: Date | string | null;
  due_date?: Date | string | null;
  billing_period_start?: Date | string | null;
  billing_period_end?: Date | string | null;
  currency: string;
  subtotal: IMoney;
  discount: IMoney;
  tax: IMoney;
  total: IMoney;
  amount_paid: IMoney;
  amount_due: IMoney;
  status: string;
  notes?: string;
}

export type PdfInvoicesRef = {
  total?: IMoney;
  amount_due?: IMoney;
  status?: string;
} & PdfRef

export type PdfPayment = {
  payment_number: string;
  invoice?: PdfInvoicesRef | string | null;
  client?: PdfClient | string | null;
  contract?: PdfRef | string | null;
  project?: PdfRef | string | null;
  amount: IMoney;
  payment_date?: Date | string | null;
  method: string;
  transaction_id?: string;
  reference?: string;
  notes?: string;
  received_by?: { name?: string; email?: string } | string | null;
}

/** Resolve a possibly-unpopulated ref into an object (or empty). */
export const asClient = (c?: PdfClient | string | null): PdfClient =>
  c && typeof c === "object" ? c : {};

export const refName = (r?: PdfRef | string | null): string =>
  r && typeof r === "object" ? r.name || r.invoice_number || r.contract_number || "" : "";

/** Address → display lines (skips blanks). */
export function addressLines(client: PdfClient): string[] {
  const a = client.address || {};
  const lines: string[] = [];
  if (a.line1) lines.push(a.line1);
  if (a.line2) lines.push(a.line2);
  const cityLine = [a.city, a.district].filter(Boolean).join(", ");
  const withZip = [cityLine, a.zip_code].filter(Boolean).join(" ");
  if (withZip) lines.push(withZip);
  if (a.country) lines.push(a.country);
  return lines;
}
