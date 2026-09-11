export const NOTIFICATION_TYPE = {
  PAYMENT_DUE: "payment_due",
  PAYMENT_OVERDUE: "payment_overdue",
  CONTRACT_RENEWAL: "contract_renewal",
  PROJECT_DEADLINE: "project_deadline",
  COMMUNICATION_FAILED: "communication_failed",
  TASK_DUE: "task_due",
  SYSTEM: "system",
} as const;

export type TNotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];
