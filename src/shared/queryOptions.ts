import { Request } from "express";
import { IPaginationOptions } from "@/interfaces/pagination.interfaces";

/** Parse standard pagination/sort params from the query string. */
export const getPaginationOptions = (req: Request): IPaginationOptions => {
  const q = req.query as Record<string, string | undefined>;
  return {
    page: q.page ? Number(q.page) : undefined,
    limit: q.limit ? Number(q.limit) : undefined,
    sortBy: q.sortBy,
    sortOrder: q.sortOrder === "asc" ? "asc" : q.sortOrder === "desc" ? "desc" : undefined,
  };
};

/** Pick a subset of string filters from the query string. */
export const getStringFilters = <K extends string>(
  req: Request,
  keys: K[]
): Partial<Record<K, string>> => {
  const q = req.query as Record<string, string | undefined>;
  const out: Partial<Record<K, string>> = {};
  for (const k of keys) {
    const v = q[k];
    if (v !== undefined && v !== "") out[k] = v;
  }
  return out;
};
