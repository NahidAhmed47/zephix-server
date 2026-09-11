export const DOCUMENT_ENTITY = {
  CLIENT: "client",
  CONTRACT: "contract",
  PROJECT: "project",
  INVOICE: "invoice",
  PAYMENT: "payment",
} as const;

export type TDocumentEntity =
  (typeof DOCUMENT_ENTITY)[keyof typeof DOCUMENT_ENTITY];
