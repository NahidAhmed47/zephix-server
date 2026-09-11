import { describe, it, expect, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { requirePermission } from "@/middlewares/requirePermission";

const run = (user: unknown, key: string | string[]) => {
  const req = { user } as unknown as Request;
  const res = {} as Response;
  const next = vi.fn();
  requirePermission(key)(req, res, next as unknown as NextFunction);
  return next;
};

describe("requirePermission middleware", () => {
  it("allows when the user holds the permission", () => {
    const next = run({ permissions: ["users.view"] }, "users.view");
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0].length).toBe(0); // no error passed
  });

  it("allows Super Admin (wildcard) for any key", () => {
    const next = run({ permissions: ["*"] }, "payments.delete");
    expect(next.mock.calls[0].length).toBe(0);
  });

  it("blocks with 403 when the permission is missing", () => {
    const next = run({ permissions: ["users.view"] }, "users.delete");
    const err = next.mock.calls[0][0];
    expect(err).toBeTruthy();
    expect(err.statusCode).toBe(403);
  });

  it("blocks with 401 when unauthenticated", () => {
    const next = run(undefined, "users.view");
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });
});
