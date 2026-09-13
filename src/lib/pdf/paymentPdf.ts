import {
  COLORS,
  FONT,
  MARGIN,
  CONTENT_W,
  CONTENT_RIGHT,
  HEADER_BOTTOM,
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
import { PdfPayment, asClient, refName } from "./types";

/** Render a complete payment receipt (letterhead → body → footers). */
export function renderPayment(
  doc: Doc,
  payment: PdfPayment,
  company: Company
): void {
  paintLetterhead(doc, company);
  doc.on("pageAdded", () => paintLetterhead(doc, company));

  const invoice =
    payment.invoice && typeof payment.invoice === "object"
      ? payment.invoice
      : null;
  const receiver =
    payment.received_by && typeof payment.received_by === "object"
      ? payment.received_by
      : null;

  // Title + receipt pill.
  const top = HEADER_BOTTOM;
  doc
    .font(FONT.bold)
    .fontSize(26)
    .fillColor(COLORS.navy)
    .text("PAYMENT RECEIPT", MARGIN, top);
  doc
    .moveTo(MARGIN, top + 34)
    .lineTo(MARGIN + 54, top + 34)
    .lineWidth(3)
    .strokeColor(COLORS.blue)
    .stroke();
  const label = "Received";
  doc.font(FONT.bold).fontSize(8.5);
  const pw = doc.widthOfString(label.toUpperCase()) + 16;
  statusPill(doc, label, CONTENT_RIGHT - pw, top + 4, "#16A34A");

  // Received From (left) + receipt details (right).
  const blockY = top + 54;
  const leftBottom = partyBlock(
    doc,
    "Received From",
    asClient(payment.client),
    MARGIN,
    blockY,
    250
  );

  const detailRows: Array<[string, string]> = [
    ["Receipt No.", payment.payment_number],
    ["Payment Date", fmtDate(payment.payment_date)],
    ["Method", humanize(payment.method)],
  ];
  if (payment.transaction_id)
    detailRows.push(["Transaction ID", payment.transaction_id]);
  if (payment.reference) detailRows.push(["Reference", payment.reference]);
  if (receiver?.name) detailRows.push(["Received By", receiver.name]);
  const rightBottom = infoRows(
    doc,
    detailRows,
    320,
    blockY + 15,
    CONTENT_RIGHT - 320
  );

  // Amount-received hero panel.
  let y = Math.max(leftBottom, rightBottom) + 22;
  const panelH = 66;
  doc.roundedRect(MARGIN, y, CONTENT_W, panelH, 6).fill(COLORS.panel);
  doc
    .font(FONT.bold)
    .fontSize(8.5)
    .fillColor(COLORS.blue)
    .text("AMOUNT RECEIVED", MARGIN + 18, y + 15, { characterSpacing: 0.6 });
  doc
    .font(FONT.bold)
    .fontSize(23)
    .fillColor(COLORS.navy)
    .text(moneyText(payment.amount), MARGIN + 18, y + 30, {
      width: CONTENT_W * 0.6,
    });
  doc
    .font(FONT.regular)
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text(`via ${humanize(payment.method)}`, CONTENT_RIGHT - 168, y + 40, {
      width: 150,
      align: "right",
    });
  y += panelH + 24;

  // Applied-to invoice.
  if (invoice) {
    caption(doc, "Applied To", MARGIN, y, CONTENT_W);
    y += 16;
    const rows: Array<[string, string]> = [
      ["Invoice", refName(invoice) || invoice.invoice_number || "—"],
    ];
    if (invoice.total) rows.push(["Invoice Total", moneyText(invoice.total)]);
    rows.push(["This Payment", moneyText(payment.amount)]);
    if (invoice.amount_due)
      rows.push(["Remaining Balance", moneyText(invoice.amount_due)]);
    infoRows(doc, rows, MARGIN, y, 280, 17);

    // Invoice status pill to the right of the applied-to block.
    if (invoice.status) {
      const st = humanize(invoice.status);
      doc.font(FONT.bold).fontSize(8.5);
      const stw = doc.widthOfString(st.toUpperCase()) + 16;
      statusPill(
        doc,
        st,
        CONTENT_RIGHT - stw,
        y,
        invoiceStatusColor(invoice.status)
      );
    }
    y += rows.length * 17 + 14;
  }

  // Notes.
  if (payment.notes) {
    caption(doc, "Notes", MARGIN, y, CONTENT_W);
    doc
      .font(FONT.regular)
      .fontSize(9.5)
      .fillColor(COLORS.muted)
      .text(payment.notes, MARGIN, y + 14, { width: CONTENT_W });
    y = doc.y + 8;
  }

  // Signature line (bottom-right).
  const sigY = Math.max(y + 40, 660);
  const sigX = CONTENT_RIGHT - 190;
  doc
    .moveTo(sigX, sigY)
    .lineTo(CONTENT_RIGHT, sigY)
    .lineWidth(0.8)
    .strokeColor(COLORS.faint)
    .stroke();
  doc
    .font(FONT.regular)
    .fontSize(8.5)
    .fillColor(COLORS.muted)
    .text("Authorized Signature", sigX, sigY + 5, {
      width: 190,
      align: "center",
    });

  // Computer-generated note.
  hr(doc, sigY + 34, COLORS.line, 0.6);
  doc
    .font(FONT.oblique)
    .fontSize(8.5)
    .fillColor(COLORS.faint)
    .text(
      "This is a computer-generated receipt and is valid without a physical signature.",
      MARGIN,
      sigY + 42,
      { width: CONTENT_W, align: "center" }
    );

  paintFooters(doc, company);
}
