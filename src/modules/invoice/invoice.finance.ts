import { Types } from "mongoose";
import { InvoiceModel } from "./invoice.model";
import { INVOICE_STATUS } from "./invoice.enum";

export interface IInvoiceFinancials {
  invoiced: number;
  collected: number;
  outstanding: number;
  overdue: number;
}

/**
 * Aggregate invoice financials for any match (client, project, or global).
 * Lives in its own file (imports only InvoiceModel) so client/project summary
 * services can reuse it without creating an import cycle with invoice.service.
 */
export const invoiceFinancials = async (
  match: Record<string, unknown>
): Promise<IInvoiceFinancials> => {
  const agg = await InvoiceModel.aggregate([
    {
      $match: {
        ...match,
        is_Deleted: false,
        status: { $ne: INVOICE_STATUS.CANCELLED },
      },
    },
    {
      $group: {
        _id: null,
        invoiced: { $sum: { $toDouble: "$total.amount" } },
        collected: { $sum: { $toDouble: "$amount_paid.amount" } },
        outstanding: { $sum: { $toDouble: "$amount_due.amount" } },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ["$due_date", "$$NOW"] },
                  { $gt: [{ $toDouble: "$amount_due.amount" }, 0] },
                ],
              },
              { $toDouble: "$amount_due.amount" },
              0,
            ],
          },
        },
      },
    },
  ]);
  const r = (agg[0] as Partial<IInvoiceFinancials>) || {};
  return {
    invoiced: r.invoiced || 0,
    collected: r.collected || 0,
    outstanding: r.outstanding || 0,
    overdue: r.overdue || 0,
  };
};

export const clientInvoiceFinancials = (clientId: string) =>
  invoiceFinancials({ client: new Types.ObjectId(clientId) });

export const projectInvoiceFinancials = (projectId: string) =>
  invoiceFinancials({ project: new Types.ObjectId(projectId) });
