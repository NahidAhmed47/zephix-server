export const PAYMENT_METHOD = {
  BANK: "bank",
  CASH: "cash",
  BKASH: "bkash",
  NAGAD: "nagad",
  CARD: "card",
  ONLINE: "online",
  OTHER: "other",
} as const;

export type TPaymentMethod =
  (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];
