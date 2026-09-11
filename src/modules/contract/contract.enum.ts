export const CONTRACT_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  EXPIRED: "expired",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  SUSPENDED: "suspended",
} as const;

export type TContractStatus =
  (typeof CONTRACT_STATUS)[keyof typeof CONTRACT_STATUS];

/** Statuses that count as live commercial agreements (renewals, MRR, etc.). */
export const LIVE_CONTRACT_STATUSES: string[] = [CONTRACT_STATUS.ACTIVE];
