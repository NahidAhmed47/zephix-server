import { Router } from "express";
import { HealthRoutes } from "@/modules/health/health.routes";
import { AuthRoutes } from "@/modules/auth/auth.routes";
import { UserRoutes } from "@/modules/user/user.routes";
import { RoleRoutes } from "@/modules/role/role.routes";
import { PermissionRoutes } from "@/modules/permission/permission.routes";
import { AuditLogRoutes } from "@/modules/auditLog/auditLog.routes";
import { SettingRoutes } from "@/modules/setting/setting.routes";
import { ClientRoutes } from "@/modules/client/client.routes";
import { ContactRoutes } from "@/modules/contact/contact.routes";
import { ServiceRoutes } from "@/modules/service/service.routes";
import { DealRoutes } from "@/modules/deal/deal.routes";
import { ContractRoutes } from "@/modules/contract/contract.routes";
import { ProjectRoutes } from "@/modules/project/project.routes";
import { HostingRoutes } from "@/modules/hosting/hosting.routes";
import { InvoiceRoutes } from "@/modules/invoice/invoice.routes";
import { PaymentRoutes } from "@/modules/payment/payment.routes";
import { RecurringBillingRoutes } from "@/modules/recurringBilling/recurringBilling.routes";
import { ExpenseRoutes } from "@/modules/expense/expense.routes";
import { RecurringExpenseRoutes } from "@/modules/recurringExpense/recurringExpense.routes";
import { MessageTemplateRoutes } from "@/modules/messageTemplate/messageTemplate.routes";
import { ReminderRuleRoutes } from "@/modules/reminderRule/reminderRule.routes";
import { CommunicationRoutes } from "@/modules/communication/communication.routes";
import { ReportRoutes } from "@/modules/report/report.routes";
import { DashboardRoutes } from "@/modules/dashboard/dashboard.routes";
import { SearchRoutes } from "@/modules/search/search.routes";
import { NotificationRoutes } from "@/modules/notification/notification.routes";
import { DocumentRoutes } from "@/modules/document/document.routes";
import { ExportRoutes } from "@/modules/export/export.routes";

const router = Router();

/**
 * Module routes. Each phase appends its modules here.
 *   Phase 1 → auth, users, roles, permissions, audit-logs, settings
 *   Phase 2 → clients, contacts, deals
 *   Phase 3 → services (catalog + categories), contracts, projects
 *   Phase 4 → invoices, payments, recurring-billing, expenses, recurring-expenses
 *   Phase 5 → message-templates, reminder-rules, communication (SMS/SMTP + logs)
 *   Phase 6 → reports (revenue/collections/mrr-arr/forecast/…), dashboard
 *   Phase 7 → search, notifications, documents, export (CSV)
 */
const moduleRoutes: { path: string; route: Router }[] = [
  { path: "/health", route: HealthRoutes },
  { path: "/auth", route: AuthRoutes },
  { path: "/users", route: UserRoutes },
  { path: "/roles", route: RoleRoutes },
  { path: "/permissions", route: PermissionRoutes },
  { path: "/audit-logs", route: AuditLogRoutes },
  { path: "/settings", route: SettingRoutes },
  { path: "/clients", route: ClientRoutes },
  { path: "/contacts", route: ContactRoutes },
  { path: "/services", route: ServiceRoutes },
  { path: "/deals", route: DealRoutes },
  { path: "/contracts", route: ContractRoutes },
  { path: "/projects", route: ProjectRoutes },
  { path: "/hosting", route: HostingRoutes },
  { path: "/invoices", route: InvoiceRoutes },
  { path: "/payments", route: PaymentRoutes },
  { path: "/recurring-billing", route: RecurringBillingRoutes },
  { path: "/expenses", route: ExpenseRoutes },
  { path: "/recurring-expenses", route: RecurringExpenseRoutes },
  { path: "/message-templates", route: MessageTemplateRoutes },
  { path: "/reminder-rules", route: ReminderRuleRoutes },
  { path: "/communication", route: CommunicationRoutes },
  { path: "/reports", route: ReportRoutes },
  { path: "/dashboard", route: DashboardRoutes },
  { path: "/search", route: SearchRoutes },
  { path: "/notifications", route: NotificationRoutes },
  { path: "/documents", route: DocumentRoutes },
  { path: "/export", route: ExportRoutes },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
