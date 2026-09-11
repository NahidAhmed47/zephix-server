export const RECORD_TYPE = {
  DOMAIN: "domain",
  SUBDOMAIN: "subdomain",
} as const;

export const HOSTING_TYPE = {
  SHARED: "shared",
  VPS: "vps",
  CLOUD: "cloud",
  DEDICATED: "dedicated",
  MANAGED: "managed",
  OTHER: "other",
} as const;

export const HOSTING_STATUS = {
  ACTIVE: "active",
  EXPIRED: "expired",
  PARKED: "parked",
  SUSPENDED: "suspended",
  TRANSFERRING: "transferring",
} as const;

export type TRecordType = (typeof RECORD_TYPE)[keyof typeof RECORD_TYPE];
export type THostingType = (typeof HOSTING_TYPE)[keyof typeof HOSTING_TYPE];
export type THostingStatus =
  (typeof HOSTING_STATUS)[keyof typeof HOSTING_STATUS];
