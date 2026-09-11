/**
 * Central messaging precedence resolver (spec §22/§23).
 *
 * The most specific override wins. Walk overrides from most-specific
 * (project / contract / service) to least (client); a concrete `on`/`off`
 * decides immediately, `inherit` (or missing) falls through. If everything
 * inherits, the global setting applies.
 *
 * This logic lives in exactly one place — callers assemble the ordered
 * override list; they never re-implement the precedence.
 */

export type TMessagingPref = "on" | "off" | "inherit";

export type TMessagingOverride =
  | { sms?: TMessagingPref; email?: TMessagingPref }
  | null
  | undefined;

export const resolveChannel = (
  overrides: Array<TMessagingPref | undefined | null>,
  globalEnabled: boolean
): boolean => {
  for (const pref of overrides) {
    if (pref === "on") return true;
    if (pref === "off") return false;
  }
  return globalEnabled;
};

/**
 * Resolve SMS + email enablement for a context. `overrides` is ordered
 * most-specific first (e.g. [schedule, project, contract, client]).
 */
export const resolveMessaging = (
  overrides: TMessagingOverride[],
  global: { sms_enabled: boolean; email_enabled: boolean }
): { sms: boolean; email: boolean } => ({
  sms: resolveChannel(
    overrides.map((o) => o?.sms),
    global.sms_enabled
  ),
  email: resolveChannel(
    overrides.map((o) => o?.email),
    global.email_enabled
  ),
});
