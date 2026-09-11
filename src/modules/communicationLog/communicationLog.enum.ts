export const COMMUNICATION_TYPE = {
  SMS: "sms",
  EMAIL: "email",
} as const;

export const COMMUNICATION_STATUS = {
  PENDING: "pending",
  SENT: "sent",
  DELIVERED: "delivered",
  FAILED: "failed",
  SKIPPED: "skipped",
} as const;

export type TCommunicationType =
  (typeof COMMUNICATION_TYPE)[keyof typeof COMMUNICATION_TYPE];
export type TCommunicationStatus =
  (typeof COMMUNICATION_STATUS)[keyof typeof COMMUNICATION_STATUS];

/** Statuses that count a message as successfully delivered (for idempotency). */
export const SENT_STATUSES: string[] = [
  COMMUNICATION_STATUS.SENT,
  COMMUNICATION_STATUS.DELIVERED,
];
