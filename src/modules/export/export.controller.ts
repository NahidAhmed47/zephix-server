import { Request, Response } from "express";
import { DateTime } from "luxon";
import BaseController from "@/shared/baseController";
import { toCsv } from "@/shared/csv";
import { ClientModel } from "@/modules/client/client.model";
import { InvoiceModel } from "@/modules/invoice/invoice.model";
import { PaymentModel } from "@/modules/payment/payment.model";
import { ExpenseModel } from "@/modules/expense/expense.model";
import { decimal128ToString } from "@/lib/money";

/* eslint-disable @typescript-eslint/no-explicit-any */

const LIMIT = 10000;
const d = (v: unknown) => (v ? DateTime.fromJSDate(new Date(v as string)).toISODate() : "");
const money = (m: any) => (m?.amount ? decimal128ToString(m.amount) : "0.00");
const refName = (r: any) => (r && typeof r === "object" ? r.name : "");

class Controller extends BaseController {
  private send(res: Response, filename: string, csv: string) {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  }

  clients = this.catchAsync(async (_req: Request, res: Response) => {
    const rows: any[] = await ClientModel.find({ is_Deleted: false })
      .populate({ path: "account_manager", select: "name" })
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean();
    const csv = toCsv(rows, [
      { header: "Name", map: (r) => r.name },
      { header: "Type", map: (r) => r.type },
      { header: "Status", map: (r) => r.status },
      { header: "Email", map: (r) => r.email },
      { header: "Phone", map: (r) => r.phone },
      { header: "Industry", map: (r) => r.industry },
      { header: "Account Manager", map: (r) => refName(r.account_manager) },
      { header: "Created", map: (r) => d(r.createdAt) },
    ]);
    this.send(res, "clients.csv", csv);
  });

  invoices = this.catchAsync(async (_req: Request, res: Response) => {
    const rows: any[] = await InvoiceModel.find({ is_Deleted: false })
      .populate({ path: "client", select: "name" })
      .sort({ issue_date: -1 })
      .limit(LIMIT)
      .lean();
    const csv = toCsv(rows, [
      { header: "Invoice", map: (r) => r.invoice_number },
      { header: "Client", map: (r) => refName(r.client) },
      { header: "Status", map: (r) => r.status },
      { header: "Total", map: (r) => money(r.total) },
      { header: "Paid", map: (r) => money(r.amount_paid) },
      { header: "Due", map: (r) => money(r.amount_due) },
      { header: "Currency", map: (r) => r.currency },
      { header: "Issued", map: (r) => d(r.issue_date) },
      { header: "Due Date", map: (r) => d(r.due_date) },
    ]);
    this.send(res, "invoices.csv", csv);
  });

  payments = this.catchAsync(async (_req: Request, res: Response) => {
    const rows: any[] = await PaymentModel.find({ is_Deleted: false })
      .populate({ path: "client", select: "name" })
      .populate({ path: "invoice", select: "invoice_number" })
      .sort({ payment_date: -1 })
      .limit(LIMIT)
      .lean();
    const csv = toCsv(rows, [
      { header: "Payment", map: (r) => r.payment_number },
      { header: "Invoice", map: (r) => (r.invoice ? r.invoice.invoice_number : "") },
      { header: "Client", map: (r) => refName(r.client) },
      { header: "Amount", map: (r) => money(r.amount) },
      { header: "Method", map: (r) => r.method },
      { header: "Transaction ID", map: (r) => r.transaction_id },
      { header: "Date", map: (r) => d(r.payment_date) },
    ]);
    this.send(res, "payments.csv", csv);
  });

  expenses = this.catchAsync(async (_req: Request, res: Response) => {
    const rows: any[] = await ExpenseModel.find({ is_Deleted: false })
      .sort({ date: -1 })
      .limit(LIMIT)
      .lean();
    const csv = toCsv(rows, [
      { header: "Title", map: (r) => r.title },
      { header: "Category", map: (r) => r.category },
      { header: "Amount", map: (r) => money(r.amount) },
      { header: "Vendor", map: (r) => r.vendor },
      { header: "Method", map: (r) => r.method },
      { header: "Date", map: (r) => d(r.date) },
    ]);
    this.send(res, "expenses.csv", csv);
  });
}

export const ExportController = new Controller();
