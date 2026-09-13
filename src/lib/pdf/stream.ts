import { Response } from "express";
import { Doc, newDocument } from "./theme";

/**
 * Create a document, stream it to the HTTP response as a file download, and
 * flush. The `render` callback draws the letterhead, body, and footers.
 */
export function streamPdf(
  res: Response,
  filename: string,
  title: string,
  render: (doc: Doc) => void
): void {
  const doc = newDocument(title);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );
  doc.pipe(res);
  render(doc);
  doc.end();
}
