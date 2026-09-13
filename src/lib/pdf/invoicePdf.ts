import {
  COLORS,
  FONT,
  MARGIN,
  CONTENT_W,
  CONTENT_RIGHT,
  HEADER_BOTTOM,
  FOOTER_TOP,
  PAGE,
  Doc,
  Company,
  caption,
  hr,
  moneyText,
  fmtDate,
  humanize,
  statusPill,
  invoiceStatusColor,
  paintLetterhead,
  paintFooters,
} from "./theme";
import { partyBlock, infoRows } from "./parts";
import { IMoney } from "@/lib/money";
import { PdfInvoice, asClient, refName } from "./types";

const num = (m?: IMoney | null): number => Number(m?.amount?.toString?.() ?? 0);
const CONTENT_BOTTOM = PAGE.height - FOOTER_TOP; // 763.89

// Line-item columns (x + width sum to the content band 50..545).
const COL = {
  idx: { x: MARGIN, w: 24 },
  desc: { x: MARGIN + 24, w: 239 },
  qty: { x: 313, w: 52 },
  unit: { x: 365, w: 88 },
  amount: { x: 453, w: 92 },
} as const;
const PAD = 8;

function tableHeader(doc: Doc, y: number): number {
  const h = 22;
  doc.rect(MARGIN, y, CONTENT_W, h).fill(COLORS.navy);
  doc.font(FONT.bold).fontSize(8.5).fillColor(COLORS.white);
  const ty = y + 7;
  doc.text("#", COL.idx.x + PAD, ty, { width: COL.idx.w - PAD });
  doc.text("DESCRIPTION", COL.desc.x + PAD, ty, { width: COL.desc.w - PAD });
  doc.text("QTY", COL.qty.x, ty, { width: COL.qty.w - PAD, align: "right" });
  doc.text("UNIT PRICE", COL.unit.x, ty, {
    width: COL.unit.w - PAD,
    align: "right",
  });
  doc.text("AMOUNT", COL.amount.x, ty, {
    width: COL.amount.w - PAD,
    align: "right",
  });
  doc.fillColor(COLORS.ink);
  return y + h;
}

function tableRow(
  doc: Doc,
  line: PdfInvoice["lines"][number],
  index: number,
  y: number
): number {
  doc.font(FONT.regular).fontSize(9.5);
  const descH = doc.heightOfString(line.description || "—", {
    width: COL.desc.w - PAD * 2,
  });
  const rowH = Math.max(24, descH + 13);

  if (index % 2 === 1) {
    doc.rect(MARGIN, y, CONTENT_W, rowH).fill(COLORS.zebra);
  }
  const ty = y + 7;
  doc.fillColor(COLORS.muted).text(String(index + 1), COL.idx.x + PAD, ty, {
    width: COL.idx.w - PAD,
  });
  doc
    .fillColor(COLORS.ink)
    .text(line.description || "—", COL.desc.x + PAD, ty, {
      width: COL.desc.w - PAD * 2,
    });
  doc.fillColor(COLORS.muted);
  doc.text(String(line.quantity ?? ""), COL.qty.x, ty, {
    width: COL.qty.w - PAD,
    align: "right",
  });
  doc.text(moneyText(line.unit_price), COL.unit.x, ty, {
    width: COL.unit.w - PAD,
    align: "right",
  });
  doc
    .font(FONT.bold)
    .fillColor(COLORS.ink)
    .text(moneyText(line.amount), COL.amount.x, ty, {
      width: COL.amount.w - PAD,
      align: "right",
    });

  hr(doc, y + rowH, COLORS.line, 0.6);
  return y + rowH;
}

/** Right-aligned totals summary; returns y below the block. */
function totals(doc: Doc, inv: PdfInvoice, y: number): number {
  const x = 320;
  const w = CONTENT_RIGHT - x; // 225
  const rows: Array<[string, string]> = [["Subtotal", moneyText(inv.subtotal)]];
  if (num(inv.discount) > 0)
    rows.push(["Discount", "− " + moneyText(inv.discount)]);
  if (num(inv.tax) > 0) rows.push(["Tax", "+ " + moneyText(inv.tax)]);
  let cy = infoRows(doc, rows, x, y, w, 16);

  // Total — emphasised on a soft panel.
  cy += 4;
  const totalH = 26;
  doc.rect(x, cy, w, totalH).fill(COLORS.panel);
  doc
    .font(FONT.bold)
    .fontSize(10.5)
    .fillColor(COLORS.navy)
    .text("Total", x + 10, cy + 8, { width: w * 0.4 });
  doc
    .font(FONT.bold)
    .fontSize(12)
    .fillColor(COLORS.navy)
    .text(moneyText(inv.total), x + w * 0.4, cy + 7, {
      width: w * 0.6 - 10,
      align: "right",
    });
  cy += totalH;

  // Paid + Amount Due.
  if (num(inv.amount_paid) > 0) {
    cy = infoRows(
      doc,
      [["Amount Paid", moneyText(inv.amount_paid)]],
      x,
      cy + 6,
      w,
      16
    );
    cy -= 0;
  }
  const dueColor =
    num(inv.amount_due) <= 0
      ? "#16A34A"
      : inv.status === "overdue"
        ? "#DC2626"
        : COLORS.navy;
  const dueY = cy + 8;
  hr(doc, dueY - 4, COLORS.line, 0.8);
  doc
    .font(FONT.bold)
    .fontSize(11)
    .fillColor(COLORS.ink)
    .text("Amount Due", x + 10, dueY + 2, { width: w * 0.4 });
  doc
    .font(FONT.bold)
    .fontSize(13)
    .fillColor(dueColor)
    .text(moneyText(inv.amount_due), x + w * 0.4, dueY, {
      width: w * 0.6 - 10,
      align: "right",
    });
  return dueY + 22;
}

/** Render a complete invoice document (letterhead → body → footers). */
export function renderInvoice(
  doc: Doc,
  invoice: PdfInvoice,
  company: Company
): void {
  paintLetterhead(doc, company);
  doc.on("pageAdded", () => paintLetterhead(doc, company));

  // Title + status.
  const top = HEADER_BOTTOM;
  doc
    .font(FONT.bold)
    .fontSize(26)
    .fillColor(COLORS.navy)
    .text("INVOICE", MARGIN, top);
  doc
    .moveTo(MARGIN, top + 34)
    .lineTo(MARGIN + 54, top + 34)
    .lineWidth(3)
    .strokeColor(COLORS.blue)
    .stroke();
  const pill = invoiceStatusColor(invoice.status);
  const label = humanize(invoice.status);
  doc.font(FONT.bold).fontSize(8.5);
  const pw = doc.widthOfString(label.toUpperCase()) + 16;
  statusPill(doc, label, CONTENT_RIGHT - pw, top + 4, pill);

  // Bill To (left) + invoice details (right).
  const blockY = top + 54;
  const leftBottom = partyBlock(
    doc,
    "Bill To",
    asClient(invoice.client),
    MARGIN,
    blockY,
    250
  );

  const detailRows: Array<[string, string]> = [
    ["Invoice No.", invoice.invoice_number],
    ["Issue Date", fmtDate(invoice.issue_date)],
    ["Due Date", fmtDate(invoice.due_date)],
  ];
  if (invoice.billing_period_start) {
    detailRows.push([
      "Billing Period",
      `${fmtDate(invoice.billing_period_start)} – ${fmtDate(invoice.billing_period_end)}`,
    ]);
  }
  const contract = refName(invoice.contract);
  if (contract) detailRows.push(["Contract", contract]);
  const project = refName(invoice.project);
  if (project) detailRows.push(["Project", project]);
  const rightBottom = infoRows(
    doc,
    detailRows,
    320,
    blockY + 15,
    CONTENT_RIGHT - 320
  );

  // Line items.
  let y = Math.max(leftBottom, rightBottom) + 24;
  y = tableHeader(doc, y);
  const lines = invoice.lines || [];
  lines.forEach((line, i) => {
    doc.font(FONT.regular).fontSize(9.5);
    const descH = doc.heightOfString(line.description || "—", {
      width: COL.desc.w - PAD * 2,
    });
    const rowH = Math.max(24, descH + 13);
    if (y + rowH > CONTENT_BOTTOM) {
      doc.addPage();
      y = tableHeader(doc, HEADER_BOTTOM);
    }
    y = tableRow(doc, line, i, y);
  });
  if (lines.length === 0) {
    doc.font(FONT.oblique).fontSize(9.5).fillColor(COLORS.faint);
    doc.text("No line items.", COL.desc.x + PAD, y + 7);
    y += 24;
    hr(doc, y, COLORS.line, 0.6);
  }

  // Totals — keep together; break if not enough room.
  if (y + 150 > CONTENT_BOTTOM) {
    doc.addPage();
    y = HEADER_BOTTOM;
  }
  const totalsBottom = totals(doc, invoice, y + 14);

  // Notes.
  let noteY = totalsBottom + 6;
  if (invoice.notes) {
    if (noteY + 60 > CONTENT_BOTTOM) {
      doc.addPage();
      noteY = HEADER_BOTTOM;
    }
    caption(doc, "Notes", MARGIN, noteY, CONTENT_W);
    doc
      .font(FONT.regular)
      .fontSize(9.5)
      .fillColor(COLORS.muted)
      .text(invoice.notes, MARGIN, noteY + 14, { width: 250 });
    noteY = doc.y;
  }

  // Closing line.
  const closeY = Math.min(
    Math.max(noteY, totalsBottom) + 18,
    CONTENT_BOTTOM - 20
  );
  // const closing =
  //   num(invoice.amount_due) > 0
  //     ? `Please make payment by ${fmtDate(invoice.due_date)}. Thank you for your business.`
  //     : "Paid in full — thank you for your business.";
  const closing = "";
  doc
    .font(FONT.oblique)
    .fontSize(9)
    .fillColor(COLORS.faint)
    .text(closing, MARGIN, closeY, { width: CONTENT_W, align: "center" });

  paintFooters(doc, company);
}
