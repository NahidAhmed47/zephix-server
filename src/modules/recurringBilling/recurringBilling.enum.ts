export const RECURRING_STATUS = {
  ACTIVE: "active",
  PAUSED: "paused",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
} as const;

export type TRecurringStatus =
  (typeof RECURRING_STATUS)[keyof typeof RECURRING_STATUS];

/** Statuses that still generate revenue (count toward MRR / upcoming). */
export const ACTIVE_RECURRING_STATUSES: string[] = [RECURRING_STATUS.ACTIVE];
