export const INVOICE_STATUS = {
  DRAFT: "draft",
  ISSUED: "issued",
  UPCOMING: "upcoming",
  PARTIALLY_PAID: "partially_paid",
  PAID: "paid",
  OVERDUE: "overdue",
  CANCELLED: "cancelled",
} as const;

export type TInvoiceStatus =
  (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

/** Statuses that still owe money — i.e. contribute to outstanding (spec §17). */
export const OPEN_INVOICE_STATUSES: string[] = [
  INVOICE_STATUS.ISSUED,
  INVOICE_STATUS.UPCOMING,
  INVOICE_STATUS.PARTIALLY_PAID,
  INVOICE_STATUS.OVERDUE,
];
