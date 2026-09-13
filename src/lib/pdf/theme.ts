import PDFDocument from "pdfkit";
import { DateTime } from "luxon";
import { formatMoney, IMoney } from "@/lib/money";
import { ZEPHIX_LOGO_PNG } from "./logo";

/**
 * Shared visual system for Zephix documents (invoice, payment receipt).
 *
 * The palette and letterhead are lifted straight from the official letterpad
 * (Zephix_Letterpad.docx): the vivid azure band, the deep navy, and the brand
 * mark. Everything is drawn as vector + one embedded logo so the output is
 * crisp at any zoom and needs no external assets at runtime.
 *
 * Money is rendered with the ISO currency code ("BDT 1,250.00") rather than a
 * glyph — the built-in PDF fonts (Helvetica) cannot render the ৳ sign, and the
 * code form is the norm on professional / cross-border invoices.
 */

export const COLORS = {
  blue: "#2588EE", // letterpad accent
  navy: "#151934", // letterpad dark band + headings
  teal: "#5EECDE", // logo highlight
  ink: "#1F2430", // body text
  muted: "#6B7280", // secondary text
  faint: "#9AA1AD", // captions
  line: "#E4E7EC", // hairline borders
  zebra: "#F6F8FB", // table stripe
  panel: "#F3F6FB", // soft panels / totals box
  white: "#FFFFFF",
} as const;

export const FONT = {
  regular: "Helvetica",
  bold: "Helvetica-Bold",
  oblique: "Helvetica-Oblique",
} as const;

// A4 geometry (points).
export const PAGE = { width: 595.28, height: 841.89 } as const;
export const MARGIN = 50;
export const HEADER_BOTTOM = 150; // content top margin (below letterhead)
export const FOOTER_TOP = 78; // content bottom margin (above footer)
export const CONTENT_X = MARGIN;
export const CONTENT_W = PAGE.width - MARGIN * 2;
export const CONTENT_RIGHT = PAGE.width - MARGIN;

export type Company = {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
}

/** Letterpad defaults — used when a Settings.company field is blank. */
const LETTERPAD_DEFAULTS: Company = {
  name: "Zephix",
  email: "nahidahmedsd47@gmail.com",
  phone: "+8801312397286",
  address: "Road #20, Nikunja-2, Khilket, Dhaka",
  website: "",
};

/** Merge saved company settings over the letterpad defaults. */
export function resolveCompany(c?: Partial<Company> | null): Company {
  return {
    name: c?.name?.trim() || LETTERPAD_DEFAULTS.name,
    email: c?.email?.trim() || LETTERPAD_DEFAULTS.email,
    phone: c?.phone?.trim() || LETTERPAD_DEFAULTS.phone,
    address: c?.address?.trim() || LETTERPAD_DEFAULTS.address,
    website: c?.website?.trim() || LETTERPAD_DEFAULTS.website,
  };
}

export type Doc = PDFKit.PDFDocument;

/** A4 document with room reserved for the letterhead and footer on every page. */
export function newDocument(title: string, author = "Zephix"): Doc {
  return new PDFDocument({
    size: "A4",
    bufferPages: true,
    margins: {
      top: HEADER_BOTTOM,
      bottom: FOOTER_TOP,
      left: MARGIN,
      right: MARGIN,
    },
    info: { Title: title, Author: author, Creator: "Zephix", Producer: "Zephix" },
  });
}

/* ------------------------------- formatters ------------------------------- */

export const moneyText = (m?: IMoney | null): string =>
  m ? `${m.currency} ${formatMoney(m, { withSymbol: false })}` : "—";

export const fmtDate = (d?: Date | string | null): string =>
  d ? DateTime.fromJSDate(new Date(d)).toFormat("dd LLL yyyy") : "—";

export const fmtDateTime = (d?: Date | string | null): string =>
  d ? DateTime.fromJSDate(new Date(d)).toFormat("dd LLL yyyy, HH:mm") : "—";

/** Title-case a snake/lower token, e.g. "partially_paid" → "Partially Paid". */
export const humanize = (s?: string): string =>
  (s || "")
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

/* ------------------------------- letterhead ------------------------------- */

/** Draw the branded letterhead on the current page. Safe to call per page. */
export function paintLetterhead(doc: Doc, company: Company): void {
  // Top band: navy full width with an azure parallelogram tab on the left.
  doc.rect(0, 0, PAGE.width, 6).fill(COLORS.navy);
  doc
    .polygon([0, 0], [232, 0], [206, 6], [0, 6])
    .fill(COLORS.blue);

  // Brand mark (aspect ~3.4:1) top-left.
  const logoW = 150;
  doc.image(ZEPHIX_LOGO_PNG, MARGIN, 34, { width: logoW });

  // Contact block, right side, with a slim navy divider.
  const blockX = 356;
  const dividerX = blockX - 14;
  doc
    .moveTo(dividerX, 36)
    .lineTo(dividerX, 96)
    .lineWidth(1.4)
    .strokeColor(COLORS.navy)
    .stroke();

  const rows: Array<[string, string]> = [
    ["Phone", company.phone],
    ["Email", company.email],
    ["Address", company.address],
  ];
  let y = 36;
  for (const [label, value] of rows) {
    if (!value) continue;
    doc.font(FONT.bold).fontSize(8.5).fillColor(COLORS.navy);
    const labelText = `${label}:  `;
    doc.text(labelText, blockX, y, { continued: true, width: CONTENT_RIGHT - blockX });
    doc.font(FONT.regular).fillColor(COLORS.muted).text(value);
    y = doc.y + 3;
  }

  // Header rule with an azure accent segment.
  const ruleY = 120;
  doc
    .moveTo(MARGIN, ruleY)
    .lineTo(CONTENT_RIGHT, ruleY)
    .lineWidth(1.2)
    .strokeColor(COLORS.navy)
    .stroke();
  doc
    .moveTo(MARGIN, ruleY)
    .lineTo(MARGIN + 120, ruleY)
    .lineWidth(2.6)
    .strokeColor(COLORS.blue)
    .stroke();

  doc.fillColor(COLORS.ink); // reset for body
}

/** Stamp the footer band + page numbers on every buffered page. */
export function paintFooters(doc: Doc, company: Company): void {
  const range = doc.bufferedPageRange();
  const site = company.website || company.email;
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    // The footer sits below the content margin; drop the bottom margin so the
    // text calls don't trigger PDFKit's auto page-break.
    doc.page.margins.bottom = 0;

    const lineY = PAGE.height - 46;
    doc
      .moveTo(MARGIN, lineY)
      .lineTo(CONTENT_RIGHT, lineY)
      .lineWidth(0.8)
      .strokeColor(COLORS.line)
      .stroke();

    doc.font(FONT.regular).fontSize(8).fillColor(COLORS.faint);
    doc.text(
      `${company.name}${site ? "  ·  " + site : ""}`,
      MARGIN,
      lineY + 7,
      { width: CONTENT_W * 0.7, align: "left" }
    );
    doc.text(
      `Page ${i + 1} of ${range.count}`,
      CONTENT_RIGHT - 120,
      lineY + 7,
      { width: 120, align: "right" }
    );

    // Slim navy base band with an azure accent on the right (echoes letterpad).
    doc.rect(0, PAGE.height - 10, PAGE.width, 10).fill(COLORS.navy);
    doc.rect(PAGE.width - 150, PAGE.height - 10, 150, 10).fill(COLORS.blue);
  }
}

/* ----------------------------- layout helpers ----------------------------- */

/** Small uppercase caption used above blocks/sections. */
export function caption(doc: Doc, text: string, x: number, y: number, w?: number): void {
  doc
    .font(FONT.bold)
    .fontSize(8)
    .fillColor(COLORS.faint)
    .text(text.toUpperCase(), x, y, { width: w, characterSpacing: 0.6 });
}

/** Full-width hairline at y. */
export function hr(doc: Doc, y: number, color: string = COLORS.line, width = 0.8): void {
  doc
    .moveTo(MARGIN, y)
    .lineTo(CONTENT_RIGHT, y)
    .lineWidth(width)
    .strokeColor(color)
    .stroke();
}

/** Rounded status pill. Returns the pill width. */
export function statusPill(
  doc: Doc,
  label: string,
  x: number,
  y: number,
  color: string
): number {
  doc.font(FONT.bold).fontSize(8.5);
  const textW = doc.widthOfString(label.toUpperCase());
  const padX = 8;
  const w = textW + padX * 2;
  const h = 17;
  doc.roundedRect(x, y, w, h, 8.5).fill(color);
  doc
    .fillColor(COLORS.white)
    .text(label.toUpperCase(), x, y + 4.5, { width: w, align: "center", characterSpacing: 0.4 });
  doc.fillColor(COLORS.ink);
  return w;
}

/** Colour for an invoice status pill. */
export function invoiceStatusColor(status: string): string {
  switch (status) {
    case "paid":
      return "#16A34A";
    case "overdue":
      return "#DC2626";
    case "partially_paid":
      return "#D97706";
    case "cancelled":
      return COLORS.faint;
    case "draft":
      return "#64748B";
    default:
      return COLORS.blue; // issued / upcoming
  }
}
