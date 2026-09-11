/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";
import mongodbConnection from "@/config/mongoDbConnection";
import { BcryptInstance } from "@/lib/bcrypt";
import { WILDCARD_PERMISSION } from "@/constants/permissions";
import { IAuthUser } from "@/lib/rbac";
import { USER_STATUS } from "@/modules/user/user.interface";

// Foundation models
import { RoleModel } from "@/modules/role/role.model";
import { UserModel } from "@/modules/user/user.model";
import { SettingModel } from "@/modules/setting/setting.model";

// Business models (for clearing + direct inserts)
import { ClientModel } from "@/modules/client/client.model";
import { ContactModel } from "@/modules/contact/contact.model";
import { ServiceModel, ServiceCategoryModel } from "@/modules/service/service.model";
import { DealModel } from "@/modules/deal/deal.model";
import { ContractModel, ContractServiceModel } from "@/modules/contract/contract.model";
import { ProjectModel } from "@/modules/project/project.model";
import { RecurringBillingModel } from "@/modules/recurringBilling/recurringBilling.model";
import { InvoiceModel } from "@/modules/invoice/invoice.model";
import { PaymentModel } from "@/modules/payment/payment.model";
import { ExpenseModel } from "@/modules/expense/expense.model";
import { RecurringExpenseModel } from "@/modules/recurringExpense/recurringExpense.model";
import { MessageTemplateModel } from "@/modules/messageTemplate/messageTemplate.model";
import { ReminderRuleModel } from "@/modules/reminderRule/reminderRule.model";
import { CommunicationLogModel } from "@/modules/communicationLog/communicationLog.model";
import { NotificationModel } from "@/modules/notification/notification.model";
import { DocumentModel } from "@/modules/document/document.model";
import { AuditLogModel } from "@/modules/auditLog/auditLog.model";
import { HostingModel } from "@/modules/hosting/hosting.model";

// Services (drive the real business logic → correct computed fields)
import { ClientService } from "@/modules/client/client.service";
import { ContactService } from "@/modules/contact/contact.service";
import { ServiceCatalogService, ServiceCategoryService } from "@/modules/service/service.service";
import { DealService } from "@/modules/deal/deal.service";
import { ContractService } from "@/modules/contract/contract.service";
import { ProjectService } from "@/modules/project/project.service";
import { RecurringBillingService } from "@/modules/recurringBilling/recurringBilling.service";
import { InvoiceService } from "@/modules/invoice/invoice.service";
import { PaymentService } from "@/modules/payment/payment.service";
import { ExpenseService } from "@/modules/expense/expense.service";
import { RecurringExpenseService } from "@/modules/recurringExpense/recurringExpense.service";
import { MessageTemplateService } from "@/modules/messageTemplate/messageTemplate.service";
import { ReminderRuleService } from "@/modules/reminderRule/reminderRule.service";
import { NotificationService } from "@/modules/notification/notification.service";
import { HostingService } from "@/modules/hosting/hosting.service";

const day = 86400000;
const agoIso = (n: number) => new Date(Date.now() - n * day).toISOString();
const fwdIso = (n: number) => new Date(Date.now() + n * day).toISOString();
const offIso = (n: number) => new Date(Date.now() + n * day).toISOString(); // n<0 = past

async function ensureFoundation() {
  let superRole = await RoleModel.findOne({ slug: "super-admin" });
  if (!superRole)
    superRole = await RoleModel.create({
      name: "Super Admin",
      slug: "super-admin",
      description: "Full, unrestricted access.",
      permissions: [WILDCARD_PERMISSION],
      is_system: true,
    });

  if (!(await SettingModel.findOne({ key: "global" })))
    await SettingModel.create({ key: "global" });

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@zephix.com").toLowerCase();
  let admin = await UserModel.findOne({ email: adminEmail });
  if (!admin)
    admin = await UserModel.create({
      name: "Super Admin",
      email: adminEmail,
      password: await BcryptInstance.hash(process.env.SEED_ADMIN_PASSWORD || "Admin@12345"),
      role: superRole._id,
      status: USER_STATUS.ACTIVE,
    });

  const roleOr = async (slug: string) =>
    (await RoleModel.findOne({ slug })) || superRole;
  const mkUser = async (name: string, email: string, roleSlug: string, dept: string) => {
    let u = await UserModel.findOne({ email });
    if (!u)
      u = await UserModel.create({
        name,
        email,
        phone_number: "+8801700000000",
        password: await BcryptInstance.hash("Test@12345"),
        role: (await roleOr(roleSlug))._id,
        status: USER_STATUS.ACTIVE,
        department: dept,
      });
    return u;
  };
  const nahid = await mkUser("Nahid Ahmed", "nahid@zephix.com", "account-manager", "Sales");
  const tania = await mkUser("Tania Rahman", "tania@zephix.com", "sales-manager", "Sales");
  const sadia = await mkUser("Sadia Islam", "sadia@zephix.com", "finance-manager", "Finance");
  const rafiq = await mkUser("Rafiq Hasan", "rafiq@zephix.com", "project-manager", "Delivery");
  return { admin, nahid, tania, sadia, rafiq };
}

async function seedDummy() {
  await mongodbConnection();
  console.log("🧪 Seeding realistic dummy data across all modules…");
  const { admin, nahid, tania, sadia, rafiq } = await ensureFoundation();
  const staff: Record<string, any> = { nahid, tania, sadia, rafiq };
  const actor: IAuthUser = {
    id: String(admin._id),
    email: admin.email,
    role: "super-admin",
    permissions: [WILDCARD_PERMISSION],
  };

  console.log("  • Clearing existing business data…");
  await Promise.all([
    ClientModel, ContactModel, ServiceModel, ServiceCategoryModel, DealModel,
    ContractModel, ContractServiceModel, ProjectModel, RecurringBillingModel,
    InvoiceModel, PaymentModel, ExpenseModel, RecurringExpenseModel,
    MessageTemplateModel, ReminderRuleModel, CommunicationLogModel,
    NotificationModel, DocumentModel, HostingModel,
  ].map((m) => (m as any).deleteMany({})));

  // ---- Service categories ----
  const cat: Record<string, string> = {};
  for (const name of ["Development", "Design", "Marketing", "Infrastructure", "Consulting"]) {
    const d = await ServiceCategoryService.create({ name, description: `${name} services` }, actor);
    cat[name] = String((d as any)._id);
  }

  // ---- Services ----
  const svc: Record<string, any> = {};
  const svcSpecs: [string, string, string, number, number][] = [
    ["Web Development", "Development", "fixed", 450000, 200000],
    ["Mobile App Development", "Development", "fixed", 650000, 300000],
    ["E-commerce Development", "Development", "fixed", 550000, 250000],
    ["SaaS Development", "Development", "milestone", 1200000, 600000],
    ["API Development", "Development", "hourly", 3000, 1500],
    ["UI/UX Design", "Design", "fixed", 250000, 100000],
    ["Website Maintenance", "Infrastructure", "monthly", 15000, 5000],
    ["Hosting", "Infrastructure", "monthly", 5000, 1500],
    ["SEO", "Marketing", "monthly", 20000, 8000],
    ["Digital Marketing", "Marketing", "monthly", 35000, 15000],
    ["Consulting", "Consulting", "hourly", 5000, 2000],
  ];
  for (const [name, category, pricing_model, price, cost] of svcSpecs) {
    svc[name] = await ServiceCatalogService.create(
      { name, category: cat[category], pricing_model, price, cost, is_active: true },
      actor
    );
  }

  // ---- Clients ----
  const cl: Record<string, any> = {};
  const clientSpecs: [string, string, string, string, string, string][] = [
    ["ABC Ltd", "Technology", "active", "nahid", "contact@abcltd.com", "+8801711000001"],
    ["XYZ Corporation", "Retail", "active", "nahid", "hello@xyzcorp.com", "+8801711000002"],
    ["Acme Industries", "Manufacturing", "active", "tania", "info@acme.com", "+8801711000003"],
    ["Globex Ltd", "Finance", "prospect", "tania", "contact@globex.com", "+8801711000004"],
    ["Initech", "Software", "lead", "nahid", "hi@initech.com", "+8801711000005"],
    ["Umbrella Corp", "Healthcare", "active", "tania", "care@umbrella.com", "+8801711000006"],
    ["Stark Enterprises", "Energy", "active", "nahid", "tony@stark.com", "+8801711000007"],
    ["Wayne Holdings", "Real Estate", "inactive", "tania", "bruce@wayne.com", "+8801711000008"],
  ];
  for (const [name, industry, status, am, email, phone] of clientSpecs) {
    cl[name] = await ClientService.create(
      { name, type: "company", industry, status, source: "referral", email, phone, account_manager: String(staff[am]._id) },
      actor
    );
  }

  // ---- Contacts ----
  const contactSpecs: [string, string, string, string, string, boolean, boolean][] = [
    ["ABC Ltd", "John Karim", "CEO", "john@abcltd.com", "+8801712000001", true, true],
    ["ABC Ltd", "Sara Ahmed", "Project Lead", "sara@abcltd.com", "+8801712000002", false, false],
    ["XYZ Corporation", "Imran Khan", "CTO", "imran@xyzcorp.com", "+8801712000003", true, false],
    ["XYZ Corporation", "Nadia Islam", "Finance Head", "nadia@xyzcorp.com", "+8801712000004", false, true],
    ["Acme Industries", "Karim Uddin", "Director", "karim@acme.com", "+8801712000005", true, true],
    ["Umbrella Corp", "Lisa Roy", "Ops Manager", "lisa@umbrella.com", "+8801712000006", true, true],
    ["Stark Enterprises", "Tony Rahman", "Owner", "tony@stark.com", "+8801712000007", true, true],
    ["Globex Ltd", "Sam Hasan", "Procurement", "sam@globex.com", "+8801712000008", true, false],
    ["Initech", "Peter Das", "Manager", "peter@initech.com", "+8801712000009", true, true],
  ];
  for (const [client, name, designation, email, phone, is_primary, is_billing] of contactSpecs) {
    await ContactService.create(
      { client: String(cl[client]._id), name, designation, email, phone, is_primary, is_billing },
      actor
    );
  }

  // ---- Deals ----
  const dealSpecs: [string, string, string, number, number, string, string, number][] = [
    ["ABC E-commerce Revamp", "ABC Ltd", "E-commerce Development", 550000, 80, "negotiation", "nahid", 25],
    ["XYZ SaaS Platform", "XYZ Corporation", "SaaS Development", 1200000, 100, "won", "nahid", -30],
    ["Globex Mobile App", "Globex Ltd", "Mobile App Development", 650000, 50, "proposal", "tania", 45],
    ["Initech Website", "Initech", "Web Development", 450000, 30, "qualified", "nahid", 60],
    ["Stark API Integration", "Stark Enterprises", "API Development", 300000, 100, "won", "nahid", -15],
    ["Acme Marketing Push", "Acme Industries", "Digital Marketing", 420000, 20, "lead", "tania", 70],
    ["Umbrella SEO Retainer", "Umbrella Corp", "SEO", 240000, 70, "negotiation", "tania", 20],
    ["Wayne Consulting", "Wayne Holdings", "Consulting", 150000, 0, "lost", "tania", -10],
  ];
  for (const [name, client, service, expected_value, probability, stage, owner, close] of dealSpecs) {
    await DealService.create(
      { name, client: String(cl[client]._id), service: String(svc[service]._id), expected_value, probability, stage, owner: String(staff[owner]._id), expected_close_date: offIso(close) },
      actor
    );
  }

  // ---- Contracts (with service lines → computes total_value + MRR) ----
  const ct: Record<string, any> = {};
  const contractSpecs: {
    name: string; client: string; am: string; start: number; end: number;
    lines: [string, string, number, number][];
  }[] = [
    { name: "ABC E-commerce + Maintenance", client: "ABC Ltd", am: "nahid", start: -120, end: 240,
      lines: [["E-commerce Development", "fixed", 550000, 1], ["Website Maintenance", "monthly", 15000, 1], ["Hosting", "monthly", 5000, 1]] },
    { name: "XYZ SaaS Platform", client: "XYZ Corporation", am: "nahid", start: -90, end: 300,
      lines: [["SaaS Development", "milestone", 1200000, 1], ["Website Maintenance", "monthly", 20000, 1]] },
    { name: "Stark API + Support", client: "Stark Enterprises", am: "nahid", start: -60, end: 45,
      lines: [["API Development", "fixed", 300000, 1], ["Website Maintenance", "monthly", 10000, 1]] },
    { name: "Umbrella SEO Retainer", client: "Umbrella Corp", am: "tania", start: -100, end: 60,
      lines: [["SEO", "monthly", 20000, 1]] },
    { name: "Acme Website", client: "Acme Industries", am: "tania", start: -30, end: 75,
      lines: [["Web Development", "fixed", 450000, 1]] },
  ];
  for (const c of contractSpecs) {
    ct[c.name] = await ContractService.create(
      {
        name: c.name, client: String(cl[c.client]._id), status: "active",
        start_date: offIso(c.start), end_date: offIso(c.end),
        account_manager: String(staff[c.am]._id), payment_terms_days: 15,
        services: c.lines.map(([service, pricing_model, price, quantity]) => ({
          service: String(svc[service]._id), name: service, pricing_model, price, quantity,
        })),
      },
      actor
    );
  }

  // ---- Projects ----
  const pr: Record<string, any> = {};
  const projectSpecs: [string, string, string, string, string, string, number, number][] = [
    ["ABC E-commerce Platform", "ABC Ltd", "ABC E-commerce + Maintenance", "E-commerce Development", "active", "high", 550000, 60],
    ["XYZ SaaS Build", "XYZ Corporation", "XYZ SaaS Platform", "SaaS Development", "active", "high", 1200000, 120],
    ["Stark API Integration", "Stark Enterprises", "Stark API + Support", "API Development", "active", "medium", 300000, 30],
    ["Umbrella SEO Campaign", "Umbrella Corp", "Umbrella SEO Retainer", "SEO", "planning", "low", 240000, 90],
    ["Acme Website Build", "Acme Industries", "Acme Website", "Web Development", "on_hold", "medium", 450000, 45],
  ];
  for (const [name, client, contract, service, status, priority, budget, deadline] of projectSpecs) {
    pr[name] = await ProjectService.create(
      { name, client: String(cl[client]._id), contract: String(ct[contract]._id), services: [String(svc[service]._id)], project_manager: String(rafiq._id), status, priority, budget, deadline: offIso(deadline) },
      actor
    );
  }

  // ---- Recurring billing (→ MRR) ----
  const recSpecs: [string, string, string, number, number][] = [
    ["ABC Ltd", "ABC E-commerce + Maintenance", "Website Maintenance", 15000, -120],
    ["ABC Ltd", "ABC E-commerce + Maintenance", "Hosting", 5000, -120],
    ["XYZ Corporation", "XYZ SaaS Platform", "Website Maintenance", 20000, -90],
    ["Umbrella Corp", "Umbrella SEO Retainer", "SEO", 20000, -100],
    ["Stark Enterprises", "Stark API + Support", "Website Maintenance", 10000, -60],
  ];
  for (const [client, contract, service, amount, start] of recSpecs) {
    await RecurringBillingService.create(
      { client: String(cl[client]._id), contract: String(ct[contract]._id), service: String(svc[service]._id), amount, frequency: "monthly", start_date: offIso(start), auto_invoice: true, description: `${service} — ${client}` },
      actor
    );
  }

  // ---- Invoices (+ payments) — spread dates → revenue/overdue/upcoming ----
  const invSpecs: {
    client: string; contract?: string; project?: string;
    lines: [string, string, number, number][]; // desc, service, qty, unit_price
    issue: number; due: number; pay: "full" | "partial" | "none"; payAt?: number;
  }[] = [
    { client: "ABC Ltd", contract: "ABC E-commerce + Maintenance", project: "ABC E-commerce Platform",
      lines: [["E-commerce Development (50%)", "E-commerce Development", 1, 275000]], issue: -150, due: -135, pay: "full", payAt: -140 },
    { client: "ABC Ltd", contract: "ABC E-commerce + Maintenance", project: "ABC E-commerce Platform",
      lines: [["E-commerce Development (final)", "E-commerce Development", 1, 275000]], issue: -40, due: -10, pay: "partial", payAt: -20 },
    { client: "XYZ Corporation", contract: "XYZ SaaS Platform", project: "XYZ SaaS Build",
      lines: [["SaaS milestone 1", "SaaS Development", 1, 600000]], issue: -120, due: -90, pay: "full", payAt: -100 },
    { client: "XYZ Corporation", contract: "XYZ SaaS Platform", project: "XYZ SaaS Build",
      lines: [["SaaS milestone 2", "SaaS Development", 1, 600000]], issue: -25, due: 5, pay: "partial", payAt: -10 },
    { client: "Stark Enterprises", contract: "Stark API + Support", project: "Stark API Integration",
      lines: [["API Development", "API Development", 1, 300000]], issue: -10, due: 20, pay: "none" },
    { client: "Acme Industries", contract: "Acme Website", project: "Acme Website Build",
      lines: [["Web Development (deposit)", "Web Development", 1, 225000]], issue: -5, due: 25, pay: "partial", payAt: -2 },
    { client: "ABC Ltd", contract: "ABC E-commerce + Maintenance",
      lines: [["Maintenance — Jun", "Website Maintenance", 1, 15000], ["Hosting — Jun", "Hosting", 1, 5000]], issue: -100, due: -85, pay: "full", payAt: -95 },
    { client: "ABC Ltd", contract: "ABC E-commerce + Maintenance",
      lines: [["Maintenance — Jul", "Website Maintenance", 1, 15000], ["Hosting — Jul", "Hosting", 1, 5000]], issue: -70, due: -55, pay: "full", payAt: -60 },
    { client: "ABC Ltd", contract: "ABC E-commerce + Maintenance",
      lines: [["Maintenance — Aug", "Website Maintenance", 1, 15000], ["Hosting — Aug", "Hosting", 1, 5000]], issue: -40, due: -25, pay: "full", payAt: -30 },
    { client: "ABC Ltd", contract: "ABC E-commerce + Maintenance",
      lines: [["Maintenance — Sep", "Website Maintenance", 1, 15000], ["Hosting — Sep", "Hosting", 1, 5000]], issue: -8, due: 7, pay: "none" },
    { client: "Umbrella Corp", contract: "Umbrella SEO Retainer",
      lines: [["SEO — Aug", "SEO", 1, 20000]], issue: -45, due: -15, pay: "none" }, // overdue
    { client: "Umbrella Corp", contract: "Umbrella SEO Retainer",
      lines: [["SEO — Sep", "SEO", 1, 20000]], issue: -6, due: 9, pay: "none" },
    { client: "XYZ Corporation", contract: "XYZ SaaS Platform",
      lines: [["Maintenance — Sep", "Website Maintenance", 1, 20000]], issue: -12, due: 3, pay: "partial", payAt: -5 },
    { client: "Globex Ltd",
      lines: [["Consulting engagement", "Consulting", 8, 5000]], issue: -20, due: -5, pay: "none" }, // overdue
  ];
  for (const s of invSpecs) {
    const inv: any = await InvoiceService.create(
      {
        client: String(cl[s.client]._id),
        contract: s.contract ? String(ct[s.contract]._id) : "",
        project: s.project ? String(pr[s.project]._id) : "",
        lines: s.lines.map(([description, service, quantity, unit_price]) => ({
          description, service: String(svc[service]._id), quantity, unit_price,
        })),
        issue_date: offIso(s.issue), due_date: offIso(s.due), status: "issued",
      },
      actor
    );
    const total = Number(inv?.total?.amount || 0);
    if (s.pay === "full")
      await PaymentService.create({ invoice: String(inv._id), amount: total, method: "bank", payment_date: offIso(s.payAt ?? -2) }, actor);
    else if (s.pay === "partial")
      await PaymentService.create({ invoice: String(inv._id), amount: Math.round(total * 0.4), method: "bkash", payment_date: offIso(s.payAt ?? -3) }, actor);
  }

  // ---- Expenses ----
  const expSpecs: [string, string, number, string, number, string?][] = [
    ["Team Salaries — Jun", "salary", 520000, "Payroll", -100],
    ["Team Salaries — Jul", "salary", 520000, "Payroll", -70],
    ["Team Salaries — Aug", "salary", 540000, "Payroll", -40],
    ["Team Salaries — Sep", "salary", 540000, "Payroll", -8],
    ["Office Rent — Aug", "office", 50000, "Landlord", -40],
    ["Office Rent — Sep", "office", 50000, "Landlord", -8],
    ["AWS Cloud Hosting", "hosting", 32000, "Amazon AWS", -15],
    ["Software Subscriptions", "software", 22000, "Various", -18],
    ["Facebook Ads — ABC", "marketing", 40000, "Meta", -22, "ABC Ltd"],
    ["Google Ads — Umbrella", "marketing", 35000, "Google", -30, "Umbrella Corp"],
    ["Business Travel", "travel", 18000, "Biman", -25],
    ["Freelance Design — XYZ", "operations", 60000, "Freelancer", -35, "XYZ Corporation"],
    ["Domain Renewals", "infrastructure", 8000, "Namecheap", -50],
    ["Office Supplies", "office", 12000, "Local Store", -12],
  ];
  for (const [title, category, amount, vendor, date, client] of expSpecs) {
    await ExpenseService.create(
      { title, category, amount, vendor, method: "bank", date: offIso(date), client: client ? String(cl[client]._id) : "" },
      actor
    );
  }

  // ---- Recurring expenses ----
  const recExpSpecs: [string, string, number, string][] = [
    ["AWS Cloud Hosting", "hosting", 32000, "Amazon AWS"],
    ["Office Rent", "office", 50000, "Landlord"],
    ["Team Salaries", "salary", 540000, "Payroll"],
    ["SaaS Subscriptions", "software", 22000, "Various"],
  ];
  for (const [title, category, amount, vendor] of recExpSpecs) {
    await RecurringExpenseService.create({ title, category, amount, vendor, frequency: "monthly", start_date: offIso(-90) });
  }

  // ---- Message templates ----
  const tpl: Record<string, any> = {};
  const tplSpecs: [string, string, string, string][] = [
    ["Payment Reminder SMS", "sms", "", "Dear {{client_name}}, payment of {{amount}} for invoice {{invoice_number}} is due on {{due_date}}. Thank you — Zephix"],
    ["Payment Reminder Email", "email", "Payment Reminder — {{invoice_number}}", "Dear {{client_name}},\n\nThis is a friendly reminder that {{amount}} for invoice {{invoice_number}} is due on {{due_date}}.\n\nThank you,\nZephix"],
    ["Welcome Email", "email", "Welcome to Zephix, {{client_name}}", "Hi {{client_name}},\n\nWelcome aboard — we're excited to work with you!\n\n— The Zephix Team"],
  ];
  for (const [name, type, subject, body] of tplSpecs) {
    tpl[name] = await MessageTemplateService.create({ name, type, subject, body, is_active: true }, actor);
  }

  // ---- Reminder rules ----
  const ruleSpecs: [string, number, boolean, boolean][] = [
    ["7 days before due", -7, true, true],
    ["On due date", 0, false, true],
    ["3 days after due", 3, true, true],
  ];
  for (const [name, offset_days, sms_enabled, email_enabled] of ruleSpecs) {
    await ReminderRuleService.create(
      { name, offset_days, sms_enabled, email_enabled, sms_template: String(tpl["Payment Reminder SMS"]._id), email_template: String(tpl["Payment Reminder Email"]._id), is_active: true },
      actor
    );
  }

  // ---- Communication logs ----
  await CommunicationLogModel.insertMany(
    [
      { type: "email", status: "delivered", recipient: "nadia@xyzcorp.com", subject: "Payment Reminder", body: "Reminder sent.", sent_at: agoIso(3), client: cl["XYZ Corporation"]._id },
      { type: "sms", status: "sent", recipient: "+8801712000001", body: "Dear John Karim, payment due.", sent_at: agoIso(3), client: cl["ABC Ltd"]._id },
      { type: "email", status: "failed", recipient: "care@umbrella.com", subject: "Payment Reminder", error: "SMTP is not configured.", sent_at: agoIso(2), client: cl["Umbrella Corp"]._id },
      { type: "sms", status: "delivered", recipient: "+8801712000005", body: "Reminder.", sent_at: agoIso(5), client: cl["Acme Industries"]._id },
      { type: "email", status: "sent", recipient: "john@abcltd.com", subject: "Welcome to Zephix", body: "Welcome!", sent_at: agoIso(40), client: cl["ABC Ltd"]._id },
      { type: "sms", status: "failed", recipient: "+8801711000006", error: "SMS credentials are not configured.", sent_at: agoIso(1), client: cl["Umbrella Corp"]._id },
      { type: "email", status: "delivered", recipient: "tony@stark.com", subject: "Payment Reminder", body: "Reminder.", sent_at: agoIso(6), client: cl["Stark Enterprises"]._id },
      { type: "sms", status: "sent", recipient: "+8801712000003", body: "Reminder.", sent_at: agoIso(8), client: cl["XYZ Corporation"]._id },
    ].map((l) => ({ ...l, sent_at: new Date(l.sent_at) }))
  );

  // ---- Notifications ----
  const notifs: [any, string, string, string, string][] = [
    [admin._id, "payment_overdue", "3 invoices are overdue", "Chase outstanding balances.", "/finance/outstanding"],
    [admin._id, "contract_renewal", "Contracts expiring within 90 days", "Review upcoming renewals.", "/contracts/renewals"],
    [nahid._id, "contract_renewal", "Stark API + Support expiring soon", "Ends in ~45 days.", "/contracts"],
    [sadia._id, "payment_due", "Upcoming invoices this month", "Several invoices are due soon.", "/finance/upcoming"],
    [admin._id, "system", "Welcome to Zephix Internal OS", "Your workspace is ready.", "/dashboard"],
  ];
  for (const [user, type, title, message, link] of notifs) {
    await NotificationService.notify({ user, type: type as any, title, message, link });
  }

  // ---- Audit logs (recent activity) ----
  await AuditLogModel.insertMany([
    { actor: nahid._id, actor_name: "Nahid Ahmed", actor_email: nahid.email, action: "client.create", module: "clients" },
    { actor: sadia._id, actor_name: "Sadia Islam", actor_email: sadia.email, action: "invoice.create", module: "invoices" },
    { actor: sadia._id, actor_name: "Sadia Islam", actor_email: sadia.email, action: "payment.create", module: "payments" },
    { actor: nahid._id, actor_name: "Nahid Ahmed", actor_email: nahid.email, action: "contract.create", module: "contracts" },
    { actor: rafiq._id, actor_name: "Rafiq Hasan", actor_email: rafiq.email, action: "project.update", module: "projects" },
    { actor: tania._id, actor_name: "Tania Rahman", actor_email: tania.email, action: "deal.update", module: "deals" },
    { actor: sadia._id, actor_name: "Sadia Islam", actor_email: sadia.email, action: "expense.create", module: "expenses" },
    { actor: admin._id, actor_name: "Super Admin", actor_email: admin.email, action: "service.create", module: "services" },
  ]);

  // ---- Documents (metadata only — real files need S3 configured) ----
  await DocumentModel.insertMany([
    { name: "ABC — Signed Contract.pdf", key: "documents/sample-abc.pdf", url: "https://example.com/sample-abc.pdf", mime: "application/pdf", size: 284000, entity_type: "client", entity_id: cl["ABC Ltd"]._id, uploaded_by: admin._id },
    { name: "XYZ — Proposal.pdf", key: "documents/sample-xyz.pdf", url: "https://example.com/sample-xyz.pdf", mime: "application/pdf", size: 156000, entity_type: "client", entity_id: cl["XYZ Corporation"]._id, uploaded_by: nahid._id },
    { name: "Acme — Statement of Work.pdf", key: "documents/sample-acme.pdf", url: "https://example.com/sample-acme.pdf", mime: "application/pdf", size: 98000, entity_type: "client", entity_id: cl["Acme Industries"]._id, uploaded_by: tania._id },
  ]);

  // ---- Domains & hosting (varied expiries → alerts + dashboard widget) ----
  const hostingSpecs: [
    string, string, string, string, string, string, string, string,
    number | null, number | null, number | null, string, string,
  ][] = [
    ["abcltd.com", "domain", "ABC Ltd", "AWS", "cloud", "AWS ap-southeast-1 (Singapore)", "13.212.1.10", "Namecheap", 18, 120, 25, "https://console.aws.amazon.com", "cPanel user: abcadmin"],
    ["app.abcltd.com", "subdomain", "ABC Ltd", "Vercel", "managed", "Vercel (Global CDN)", "76.76.21.21", "", null, 200, 40, "https://vercel.com/dashboard", ""],
    ["xyzcorp.com", "domain", "XYZ Corporation", "DigitalOcean", "vps", "DigitalOcean SGP1 (Singapore)", "139.59.1.20", "GoDaddy", 60, 12, 10, "https://cloud.digitalocean.com", "root ssh key in vault"],
    ["acme.com", "domain", "Acme Industries", "Hostinger", "shared", "Hostinger (Lithuania)", "145.14.1.30", "Hostinger", 300, 300, 55, "https://hpanel.hostinger.com", ""],
    ["umbrella.com", "domain", "Umbrella Corp", "AWS", "cloud", "AWS us-east-1 (N. Virginia)", "54.210.1.40", "Cloudflare", -5, 90, 15, "https://console.aws.amazon.com", ""],
    ["stark.com", "domain", "Stark Enterprises", "Linode", "vps", "Linode Tokyo (Japan)", "172.104.1.50", "Namecheap", 200, 22, 80, "https://cloud.linode.com", "admin panel login"],
    ["globex.com", "domain", "Globex Ltd", "GoDaddy", "shared", "GoDaddy (Arizona, US)", "160.153.1.60", "GoDaddy", 250, 250, 200, "https://godaddy.com", ""],
  ];
  for (const [name, type, client, provider, hosting_type, server_location, server_ip, registrar, dExp, hExp, sExp, panel, creds] of hostingSpecs) {
    await HostingService.create(
      {
        name, type, client: String(cl[client]._id), provider, hosting_type,
        server_location, server_ip, registrar,
        domain_expiry: dExp != null ? offIso(dExp) : undefined,
        hosting_expiry: hExp != null ? offIso(hExp) : undefined,
        ssl_expiry: sExp != null ? offIso(sExp) : undefined,
        control_panel_url: panel,
        credentials: creds || "",
        auto_renew: true,
        status: dExp != null && dExp < 0 ? "expired" : "active",
      },
      actor
    );
  }

  const counts = {
    users: await UserModel.countDocuments({}),
    clients: await ClientModel.countDocuments({}),
    contacts: await ContactModel.countDocuments({}),
    services: await ServiceModel.countDocuments({}),
    deals: await DealModel.countDocuments({}),
    contracts: await ContractModel.countDocuments({}),
    projects: await ProjectModel.countDocuments({}),
    recurring_billing: await RecurringBillingModel.countDocuments({}),
    invoices: await InvoiceModel.countDocuments({}),
    payments: await PaymentModel.countDocuments({}),
    expenses: await ExpenseModel.countDocuments({}),
    recurring_expenses: await RecurringExpenseModel.countDocuments({}),
    templates: await MessageTemplateModel.countDocuments({}),
    reminder_rules: await ReminderRuleModel.countDocuments({}),
    comm_logs: await CommunicationLogModel.countDocuments({}),
    notifications: await NotificationModel.countDocuments({}),
    documents: await DocumentModel.countDocuments({}),
    hosting: await HostingModel.countDocuments({}),
  };
  console.log("✅ Dummy seed complete:");
  console.table(counts);
  console.log("   Login: admin@zephix.com / Admin@12345  (staff: nahid@zephix.com … / Test@12345)");
  await mongoose.disconnect();
  process.exit(0);
}

seedDummy().catch(async (error) => {
  console.error("❌ Dummy seed failed:", error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
