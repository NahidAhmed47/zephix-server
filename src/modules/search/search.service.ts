import { can, IAuthUser } from "@/lib/rbac";
import { ClientModel } from "@/modules/client/client.model";
import { ContactModel } from "@/modules/contact/contact.model";
import { DealModel } from "@/modules/deal/deal.model";
import { ServiceModel } from "@/modules/service/service.model";
import { ContractModel } from "@/modules/contract/contract.model";
import { ProjectModel } from "@/modules/project/project.model";
import { InvoiceModel } from "@/modules/invoice/invoice.model";
import { PaymentModel } from "@/modules/payment/payment.model";

export interface ISearchItem {
  id: string;
  label: string;
  sub?: string;
  href: string;
}
export interface ISearchGroup {
  type: string;
  label: string;
  items: ISearchItem[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Escape user input before using it in a $regex — prevents regex injection /
 *  ReDoS from a crafted search term. */
const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

class Search {
  /** Permission-aware global search (spec §49). Only groups the caller can view
   *  are queried; each is capped so the palette stays fast. */
  async search(query: string, user: IAuthUser) {
    const term = (query || "").trim();
    if (term.length < 2) return { query: term, groups: [] };
    const r = { $regex: escapeRegex(term), $options: "i" };

    const defs: {
      type: string;
      label: string;
      perm: string;
      run: () => Promise<ISearchItem[]>;
    }[] = [
      {
        type: "clients",
        label: "Clients",
        perm: "clients.view",
        run: async () =>
          (
            await ClientModel.find({
              is_Deleted: false,
              $or: [{ name: r }, { email: r }, { phone: r }],
            })
              .select("name email")
              .limit(5)
              .lean()
          ).map((x: any) => ({
            id: String(x._id),
            label: x.name,
            sub: x.email || "",
            href: `/crm/clients/${x._id}`,
          })),
      },
      {
        type: "contacts",
        label: "Contacts",
        perm: "contacts.view",
        run: async () =>
          (
            await ContactModel.find({
              is_Deleted: false,
              $or: [{ name: r }, { email: r }, { phone: r }],
            })
              .select("name email client")
              .limit(5)
              .lean()
          ).map((x: any) => ({
            id: String(x._id),
            label: x.name,
            sub: x.email || "",
            href: `/crm/clients/${x.client}`,
          })),
      },
      {
        type: "deals",
        label: "Deals",
        perm: "deals.view",
        run: async () =>
          (
            await DealModel.find({ is_Deleted: false, name: r })
              .select("name")
              .limit(5)
              .lean()
          ).map((x: any) => ({
            id: String(x._id),
            label: x.name,
            href: `/crm/deals`,
          })),
      },
      {
        type: "services",
        label: "Services",
        perm: "services.view",
        run: async () =>
          (
            await ServiceModel.find({
              is_Deleted: false,
              $or: [{ name: r }, { code: r }],
            })
              .select("name")
              .limit(5)
              .lean()
          ).map((x: any) => ({
            id: String(x._id),
            label: x.name,
            href: `/services`,
          })),
      },
      {
        type: "contracts",
        label: "Contracts",
        perm: "contracts.view",
        run: async () =>
          (
            await ContractModel.find({
              is_Deleted: false,
              $or: [{ contract_number: r }, { name: r }],
            })
              .select("contract_number name")
              .limit(5)
              .lean()
          ).map((x: any) => ({
            id: String(x._id),
            label: x.contract_number,
            sub: x.name,
            href: `/contracts/${x._id}`,
          })),
      },
      {
        type: "projects",
        label: "Projects",
        perm: "projects.view",
        run: async () =>
          (
            await ProjectModel.find({ is_Deleted: false, name: r })
              .select("name")
              .limit(5)
              .lean()
          ).map((x: any) => ({
            id: String(x._id),
            label: x.name,
            href: `/projects/${x._id}`,
          })),
      },
      {
        type: "invoices",
        label: "Invoices",
        perm: "invoices.view",
        run: async () =>
          (
            await InvoiceModel.find({ is_Deleted: false, invoice_number: r })
              .select("invoice_number")
              .limit(5)
              .lean()
          ).map((x: any) => ({
            id: String(x._id),
            label: x.invoice_number,
            href: `/finance/invoices/${x._id}`,
          })),
      },
      {
        type: "payments",
        label: "Payments",
        perm: "payments.view",
        run: async () =>
          (
            await PaymentModel.find({ is_Deleted: false, payment_number: r })
              .select("payment_number")
              .limit(5)
              .lean()
          ).map((x: any) => ({
            id: String(x._id),
            label: x.payment_number,
            href: `/finance/payments`,
          })),
      },
    ];

    const groups = await Promise.all(
      defs.map(async (d) => ({
        type: d.type,
        label: d.label,
        items: can(user.permissions, d.perm) ? await d.run() : [],
      }))
    );
    return { query: term, groups: groups.filter((g) => g.items.length > 0) };
  }
}

export const SearchService = new Search();
