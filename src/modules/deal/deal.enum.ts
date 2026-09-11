export const DEAL_STAGE = {
  LEAD: "lead",
  QUALIFIED: "qualified",
  PROPOSAL: "proposal",
  NEGOTIATION: "negotiation",
  WON: "won",
  LOST: "lost",
} as const;

export type TDealStage = (typeof DEAL_STAGE)[keyof typeof DEAL_STAGE];

/** Stages considered "open" pipeline (not yet closed). */
export const OPEN_STAGES: string[] = [
  DEAL_STAGE.LEAD,
  DEAL_STAGE.QUALIFIED,
  DEAL_STAGE.PROPOSAL,
  DEAL_STAGE.NEGOTIATION,
];
