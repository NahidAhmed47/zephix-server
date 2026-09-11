export const CLIENT_STATUS = {
  LEAD: "lead",
  PROSPECT: "prospect",
  ACTIVE: "active",
  INACTIVE: "inactive",
  COMPLETED: "completed",
  BLACKLISTED: "blacklisted",
} as const;

export const CLIENT_TYPE = {
  INDIVIDUAL: "individual",
  COMPANY: "company",
} as const;

export const CLIENT_SOURCE = {
  REFERRAL: "referral",
  WEBSITE: "website",
  ADS: "ads",
  SOCIAL: "social",
  OUTBOUND: "outbound",
  EVENT: "event",
  OTHER: "other",
} as const;

/** Messaging preference — three states so lower levels can inherit from parents. */
export const MESSAGING_PREF = {
  ON: "on",
  OFF: "off",
  INHERIT: "inherit",
} as const;

export type TClientStatus = (typeof CLIENT_STATUS)[keyof typeof CLIENT_STATUS];
export type TMessagingPref =
  (typeof MESSAGING_PREF)[keyof typeof MESSAGING_PREF];
