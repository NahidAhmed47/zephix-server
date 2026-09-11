export interface CsvColumn<T> {
  header: string;
  map: (row: T) => string | number | null | undefined;
}

const escape = (v: unknown): string => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Render rows to a CSV string. Values are escaped; a leading BOM is added so
 *  Excel opens UTF-8 (e.g. the ৳ symbol) correctly. */
export const toCsv = <T>(rows: T[], columns: CsvColumn<T>[]): string => {
  const head = columns.map((c) => escape(c.header)).join(",");
  const body = rows
    .map((r) => columns.map((c) => escape(c.map(r))).join(","))
    .join("\n");
  return `﻿${head}\n${body}`;
};
