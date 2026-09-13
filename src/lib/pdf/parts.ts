import { COLORS, FONT, Doc, caption } from "./theme";
import { PdfClient, addressLines } from "./types";

/**
 * A named party block ("Bill To" / "Received From"): caption, name, address,
 * and contact rows. Returns the y just below the block.
 */
export function partyBlock(
  doc: Doc,
  label: string,
  party: PdfClient,
  x: number,
  y: number,
  w: number
): number {
  caption(doc, label, x, y, w);
  y += 15;

  doc.font(FONT.bold).fontSize(12.5).fillColor(COLORS.ink);
  doc.text(party.name || "—", x, y, { width: w });
  y = doc.y + 2;

  const detail = [
    ...addressLines(party),
    party.email || "",
    party.phone || "",
  ].filter(Boolean);

  doc.font(FONT.regular).fontSize(9.5).fillColor(COLORS.muted);
  for (const line of detail) {
    doc.text(line, x, y, { width: w });
    y = doc.y + 1;
  }
  return y;
}

/**
 * Label/value rows with the label muted-left and value bold-right. Returns the
 * y below the last row.
 */
export function infoRows(
  doc: Doc,
  rows: Array<[string, string]>,
  x: number,
  y: number,
  w: number,
  rowH = 17
): number {
  const labelW = w * 0.42;
  const valueW = w - labelW;
  rows.forEach(([label, value], i) => {
    const ry = y + i * rowH;
    doc
      .font(FONT.regular)
      .fontSize(9.5)
      .fillColor(COLORS.muted)
      .text(label, x, ry, { width: labelW });
    doc
      .font(FONT.bold)
      .fontSize(9.5)
      .fillColor(COLORS.ink)
      .text(value, x + labelW, ry, { width: valueW, align: "right" });
  });
  return y + rows.length * rowH;
}
