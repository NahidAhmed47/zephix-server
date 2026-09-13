/**
 * Central permission catalog — the single source of truth for RBAC.
 * Keys are dotted `module.action`. Roles store an array of these keys
 * (Super Admin holds the wildcard "*"). Do not scatter permission strings.
 */

export interface IPermissionAction {
  action: string;
  key: string; // `${module}.${action}`
  label: string;
  sensitive?: boolean;
}

export interface IPermissionModule {
  module: string;
  label: string;
  actions: IPermissionAction[];
}

export const WILDCARD_PERMISSION = "*";

type ActionTuple = [action: string, label: string, sensitive?: boolean];

const mod = (
  module: string,
  label: string,
  actions: ActionTuple[]
): IPermissionModule => ({
  module,
  label,
  actions: actions.map(([action, aLabel, sensitive]) => ({
    action,
    key: `${module}.${action}`,
    label: aLabel,
    sensitive: !!sensitive,
  })),
});

export const PERMISSION_CATALOG: IPermissionModule[] = [
  mod("clients", "Clients", [
    ["view", "View clients"],
    ["create", "Create clients"],
    ["edit", "Edit clients"],
    ["delete", "Delete clients", true],
    ["export", "Export clients"],
  ]),
  mod("contacts", "Contacts", [
    ["view", "View contacts"],
    ["create", "Create contacts"],
    ["edit", "Edit contacts"],
    ["delete", "Delete contacts", true],
  ]),
  mod("services", "Service Catalog", [
    ["view", "View services"],
    ["create", "Create services"],
    ["edit", "Edit services"],
    ["delete", "Delete services", true],
  ]),
  mod("deals", "Deals", [
    ["view", "View deals"],
    ["create", "Create deals"],
    ["edit", "Edit deals"],
    ["delete", "Delete deals", true],
    ["export", "Export deals"],
  ]),
  mod("projects", "Projects", [
    ["view", "View projects"],
    ["create", "Create projects"],
    ["edit", "Edit projects"],
    ["delete", "Delete projects", true],
  ]),
  mod("hosting", "Domains & Hosting", [
    ["view", "View hosting records"],
    ["create", "Create hosting records"],
    ["edit", "Edit hosting records"],
    ["delete", "Delete hosting records", true],
    ["view_credentials", "Reveal hosting credentials", true],
  ]),
  mod("contracts", "Contracts", [
    ["view", "View contracts"],
    ["create", "Create contracts"],
    ["edit", "Edit contracts"],
    ["delete", "Delete contracts", true],
    ["renew", "Renew contracts"],
    ["terminate", "Terminate contracts", true],
    ["export", "Export contracts"],
  ]),
  mod("invoices", "Invoices", [
    ["view", "View invoices"],
    ["create", "Create invoices"],
    ["edit", "Edit invoices"],
    ["delete", "Delete invoices", true],
    ["send", "Send invoices", true],
    ["cancel", "Cancel invoices", true],
    ["export", "Export invoices"],
  ]),
  mod("payments", "Payments", [
    ["view", "View payments"],
    ["create", "Record payments"],
    ["edit", "Edit payments"],
    ["delete", "Delete payments", true],
    ["refund", "Refund payments", true],
    ["mark_paid", "Mark as paid", true],
    ["export", "Export payments"],
  ]),
  mod("recurring_billing", "Recurring Billing", [
    ["view", "View recurring billing"],
    ["create", "Create schedules"],
    ["edit", "Edit schedules"],
    ["delete", "Delete schedules", true],
  ]),
  mod("expenses", "Expenses", [
    ["view", "View expenses"],
    ["create", "Create expenses"],
    ["edit", "Edit expenses"],
    ["delete", "Delete expenses", true],
    ["export", "Export expenses"],
  ]),
  mod("recurring_expenses", "Recurring Expenses", [
    ["view", "View recurring expenses"],
    ["create", "Create recurring expenses"],
    ["edit", "Edit recurring expenses"],
    ["delete", "Delete recurring expenses", true],
  ]),
  mod("reports", "Reports", [
    ["view", "View reports"],
    ["view_financial", "View financial reports", true],
    ["export", "Export reports"],
  ]),
  mod("communication", "Communication", [
    ["view", "View communication"],
    ["send", "Send SMS / Email", true],
    ["manage_templates", "Manage templates"],
    ["manage_rules", "Manage reminder rules"],
  ]),
  mod("documents", "Documents", [
    ["view", "View documents"],
    ["create", "Upload documents"],
    ["delete", "Delete documents", true],
  ]),
  mod("notifications", "Notifications", [["view", "View notifications"]]),
  mod("users", "Users", [
    ["view", "View users"],
    ["create", "Create users"],
    ["edit", "Edit users"],
    ["delete", "Delete users", true],
  ]),
  mod("roles", "Roles & Permissions", [
    ["view", "View roles"],
    ["create", "Create roles"],
    ["edit", "Edit roles", true],
    ["delete", "Delete roles", true],
  ]),
  mod("settings", "Settings", [
    ["view", "View settings"],
    ["edit", "Edit settings", true],
    ["manage_credentials", "Manage SMS/SMTP credentials", true],
  ]),
  mod("audit_logs", "Audit Logs", [
    ["view", "View audit logs"],
    ["export", "Export audit logs", true],
  ]),
];

/** Modules that support data scoping (all/own/assigned/team). */
export const SCOPED_MODULES = [
  "clients",
  "contacts",
  "deals",
  "projects",
  "hosting",
  "contracts",
  "invoices",
  "payments",
  "recurring_billing",
  "expenses",
];

export const PERMISSION_KEYS: string[] = PERMISSION_CATALOG.flatMap((m) =>
  m.actions.map((a) => a.key)
);

export const SENSITIVE_PERMISSION_KEYS: string[] = PERMISSION_CATALOG.flatMap(
  (m) => m.actions.filter((a) => a.sensitive).map((a) => a.key)
);

const PERMISSION_KEY_SET = new Set(PERMISSION_KEYS);

export const isValidPermissionKey = (key: string): boolean =>
  key === WILDCARD_PERMISSION || PERMISSION_KEY_SET.has(key);
