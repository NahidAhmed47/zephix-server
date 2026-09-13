import { Request, Response } from "express";
import BaseController from "@/shared/baseController";
import { InvoiceService } from "./invoice.service";
import { auditService } from "@/services/audit.service";
import { getPaginationOptions, getStringFilters } from "@/shared/queryOptions";
import { IAuthUser } from "@/lib/rbac";
import { streamPdf } from "@/lib/pdf/stream";
import { renderInvoice } from "@/lib/pdf/invoicePdf";
import { resolveCompany } from "@/lib/pdf/theme";
import { PdfInvoice } from "@/lib/pdf/types";

class Controller extends BaseController {
  create = this.catchAsync(async (req: Request, res: Response) => {
    const invoice = await InvoiceService.create(req.body, req.user as IAuthUser);
    await auditService.log({
      req,
      action: "invoice.create",
      module: "invoices",
      resource_id: String(invoice?._id),
      after: { invoice_number: invoice?.invoice_number },
    });
    this.sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Invoice created successfully.",
      data: invoice,
    });
  });

  list = this.catchAsync(async (req: Request, res: Response) => {
    const options = getPaginationOptions(req);
    const filters = getStringFilters(req, [
      "status",
      "client",
      "contract",
      "project",
      "search",
    ]);
    const result = await InvoiceService.list(options, filters, req.user as IAuthUser);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Invoices fetched successfully.",
      data: result,
    });
  });

  outstanding = this.catchAsync(async (req: Request, res: Response) => {
    const options = getPaginationOptions(req);
    const filters = getStringFilters(req, ["client", "search"]);
    const result = await InvoiceService.outstanding(
      options,
      filters,
      req.user as IAuthUser
    );
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Outstanding invoices fetched successfully.",
      data: result,
    });
  });

  upcoming = this.catchAsync(async (req: Request, res: Response) => {
    const result = await InvoiceService.upcoming(req.user as IAuthUser);
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Upcoming income fetched successfully.",
      data: result,
    });
  });

  getOne = this.catchAsync(async (req: Request, res: Response) => {
    const invoice = await InvoiceService.getById(
      req.params.id,
      req.user as IAuthUser
    );
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Invoice fetched successfully.",
      data: invoice,
    });
  });

  pdf = this.catchAsync(async (req: Request, res: Response) => {
    const { invoice, company } = await InvoiceService.getForDocument(
      req.params.id,
      req.user as IAuthUser
    );
    streamPdf(
      res,
      `${invoice.invoice_number}.pdf`,
      `Invoice ${invoice.invoice_number}`,
      (doc) =>
        renderInvoice(doc, invoice as unknown as PdfInvoice, resolveCompany(company))
    );
  });

  update = this.catchAsync(async (req: Request, res: Response) => {
    const { updated, before } = await InvoiceService.update(
      req.params.id,
      req.body,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "invoice.update",
      module: "invoices",
      resource_id: req.params.id,
      before: { total: before.total, status: before.status },
      after: { total: updated?.total, status: updated?.status },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Invoice updated successfully.",
      data: updated,
    });
  });

  send = this.catchAsync(async (req: Request, res: Response) => {
    const { updated } = await InvoiceService.send(
      req.params.id,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "invoice.send",
      module: "invoices",
      resource_id: req.params.id,
      after: { status: updated?.status },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Invoice issued successfully.",
      data: updated,
    });
  });

  cancel = this.catchAsync(async (req: Request, res: Response) => {
    const { updated } = await InvoiceService.cancel(
      req.params.id,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "invoice.cancel",
      module: "invoices",
      resource_id: req.params.id,
      after: { status: updated?.status },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Invoice cancelled.",
      data: updated,
    });
  });

  remove = this.catchAsync(async (req: Request, res: Response) => {
    const before = await InvoiceService.remove(
      req.params.id,
      req.user as IAuthUser
    );
    await auditService.log({
      req,
      action: "invoice.delete",
      module: "invoices",
      resource_id: req.params.id,
      before: { invoice_number: before.invoice_number },
    });
    this.sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Invoice deleted successfully.",
      data: null,
    });
  });
}

export const InvoiceController = new Controller();
