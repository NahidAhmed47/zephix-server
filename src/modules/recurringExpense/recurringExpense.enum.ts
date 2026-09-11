export const RECURRING_EXPENSE_STATUS = {
  ACTIVE: "active",
  PAUSED: "paused",
  CANCELLED: "cancelled",
} as const;

export type TRecurringExpenseStatus =
  (typeof RECURRING_EXPENSE_STATUS)[keyof typeof RECURRING_EXPENSE_STATUS];

export const ACTIVE_RECURRING_EXPENSE_STATUSES: string[] = [
  RECURRING_EXPENSE_STATUS.ACTIVE,
];
