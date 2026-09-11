export const PROJECT_STATUS = {
  PLANNING: "planning",
  ACTIVE: "active",
  ON_HOLD: "on_hold",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const PROJECT_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

export type TProjectStatus =
  (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];
export type TProjectPriority =
  (typeof PROJECT_PRIORITY)[keyof typeof PROJECT_PRIORITY];

/** Statuses that count as in-flight delivery (for client "active projects"). */
export const ACTIVE_PROJECT_STATUSES: string[] = [
  PROJECT_STATUS.PLANNING,
  PROJECT_STATUS.ACTIVE,
  PROJECT_STATUS.ON_HOLD,
];
