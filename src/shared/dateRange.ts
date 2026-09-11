import { Request } from "express";

export interface IDateRange {
  start: Date;
  end: Date;
}

/**
 * Parse a reporting date range from the query string (spec §32/§103).
 * Explicit `from`/`to` win; otherwise a `preset` (this_month, last_month,
 * this_quarter, this_year) is applied; default is the current month.
 */
export const parseRange = (req: Request): IDateRange => {
  const q = req.query as Record<string, string | undefined>;
  const now = new Date();

  if (q.from || q.to) {
    const start = q.from
      ? new Date(q.from)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = q.to ? new Date(q.to) : new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  switch (q.preset) {
    case "last_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end };
    }
    case "this_quarter": {
      const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
      return {
        start: new Date(now.getFullYear(), qStartMonth, 1),
        end: endOfToday,
      };
    }
    case "this_year":
      return { start: new Date(now.getFullYear(), 0, 1), end: endOfToday };
    case "this_month":
    default:
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: endOfToday,
      };
  }
};
