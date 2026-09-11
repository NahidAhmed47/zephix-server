/**
 * Tiny, safe template engine for SMS / email bodies (spec §24). Substitutes
 * `{{ variable }}` tokens; unknown tokens are left intact so a missing value is
 * visible rather than silently blanked. No code execution — plain replacement.
 */

/** The variable catalog available to templates (spec §24). */
export const TEMPLATE_VARIABLES = [
  "client_name",
  "company_name",
  "service_name",
  "project_name",
  "contract_name",
  "invoice_number",
  "amount",
  "due_date",
  "payment_period",
  "payment_link",
  "zephix_contact",
] as const;

export type TTemplateVars = Record<string, string | number | null | undefined>;

const TOKEN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Replace known `{{var}}` tokens; leave unknown/empty tokens as-is. */
export const renderTemplate = (
  template: string,
  vars: TTemplateVars = {}
): string =>
  (template || "").replace(TOKEN, (_match, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? `{{${key}}}` : String(value);
  });

/** Distinct variable names referenced by a template. */
export const extractVariables = (template: string): string[] => {
  const found = new Set<string>();
  const re = new RegExp(TOKEN);
  let m: RegExpExecArray | null;
  while ((m = re.exec(template || "")) !== null) found.add(m[1]);
  return [...found];
};

/** Variables referenced but not in the known catalog (spec §24 validation). */
export const unknownVariables = (template: string): string[] => {
  const known = TEMPLATE_VARIABLES as readonly string[];
  return extractVariables(template).filter((v) => !known.includes(v));
};
