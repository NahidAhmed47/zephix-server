export const EXPENSE_CATEGORY = {
  SALARY: "salary",
  OFFICE: "office",
  HOSTING: "hosting",
  SOFTWARE: "software",
  MARKETING: "marketing",
  INFRASTRUCTURE: "infrastructure",
  TRAVEL: "travel",
  OPERATIONS: "operations",
  OTHER: "other",
} as const;

export type TExpenseCategory =
  (typeof EXPENSE_CATEGORY)[keyof typeof EXPENSE_CATEGORY];
