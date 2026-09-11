import mongoose from "mongoose";
import slugify from "slugify";
import mongodbConnection from "@/config/mongoDbConnection";
import { RoleModel } from "@/modules/role/role.model";
import { UserModel } from "@/modules/user/user.model";
import { SettingModel } from "@/modules/setting/setting.model";
import { BcryptInstance } from "@/lib/bcrypt";
import { WILDCARD_PERMISSION } from "@/constants/permissions";
import { USER_STATUS } from "@/modules/user/user.interface";

const p = (module: string, actions: string[]): string[] =>
  actions.map((a) => `${module}.${a}`);

/** Example roles — created only if missing (never overwrites edits). */
const EXAMPLE_ROLES: {
  name: string;
  description: string;
  permissions: string[];
  scopes?: Record<string, string>;
}[] = [
  {
    name: "Management",
    description: "Company-wide visibility incl. financial reports.",
    permissions: [
      ...p("clients", ["view", "export"]),
      ...p("contacts", ["view"]),
      ...p("services", ["view"]),
      ...p("deals", ["view", "export"]),
      ...p("projects", ["view"]),
      ...p("contracts", ["view", "export"]),
      ...p("invoices", ["view", "export"]),
      ...p("payments", ["view", "export"]),
      ...p("recurring_billing", ["view"]),
      ...p("expenses", ["view", "export"]),
      ...p("recurring_expenses", ["view"]),
      ...p("reports", ["view", "view_financial", "export"]),
      ...p("tasks", ["view"]),
      ...p("documents", ["view"]),
      ...p("notifications", ["view"]),
      ...p("audit_logs", ["view"]),
    ],
  },
  {
    name: "Finance Manager",
    description: "Manages invoices, payments, recurring billing and expenses.",
    permissions: [
      ...p("clients", ["view"]),
      ...p("services", ["view"]),
      ...p("contracts", ["view"]),
      ...p("invoices", ["view", "create", "edit", "send", "cancel", "export"]),
      ...p("payments", ["view", "create", "edit", "mark_paid", "export"]),
      ...p("recurring_billing", ["view", "create", "edit"]),
      ...p("expenses", ["view", "create", "edit", "export"]),
      ...p("recurring_expenses", ["view", "create", "edit"]),
      ...p("reports", ["view", "view_financial", "export"]),
      ...p("communication", ["view"]),
      ...p("tasks", ["view", "create", "edit"]),
      ...p("notifications", ["view"]),
    ],
  },
  {
    name: "Account Manager",
    description: "Owns assigned clients and their relationships.",
    permissions: [
      ...p("clients", ["view", "create", "edit"]),
      ...p("contacts", ["view", "create", "edit"]),
      ...p("deals", ["view", "create", "edit"]),
      ...p("projects", ["view"]),
      ...p("contracts", ["view"]),
      ...p("invoices", ["view"]),
      ...p("payments", ["view"]),
      ...p("recurring_billing", ["view"]),
      ...p("tasks", ["view", "create", "edit"]),
      ...p("reports", ["view"]),
      ...p("notifications", ["view"]),
    ],
    scopes: {
      clients: "assigned",
      contacts: "assigned",
      deals: "assigned",
      projects: "assigned",
      invoices: "assigned",
      payments: "assigned",
      tasks: "own",
    },
  },
  {
    name: "Sales Manager",
    description: "Runs the deal pipeline and client acquisition.",
    permissions: [
      ...p("clients", ["view", "create", "edit"]),
      ...p("contacts", ["view", "create", "edit"]),
      ...p("deals", ["view", "create", "edit", "delete", "export"]),
      ...p("services", ["view"]),
      ...p("reports", ["view"]),
      ...p("tasks", ["view", "create", "edit"]),
      ...p("notifications", ["view"]),
    ],
  },
  {
    name: "Project Manager",
    description: "Delivers assigned projects.",
    permissions: [
      ...p("projects", ["view", "edit"]),
      ...p("clients", ["view"]),
      ...p("contracts", ["view"]),
      ...p("services", ["view"]),
      ...p("tasks", ["view", "create", "edit", "delete"]),
      ...p("documents", ["view", "create"]),
      ...p("notifications", ["view"]),
    ],
    scopes: { projects: "assigned", tasks: "own" },
  },
];

async function seed() {
  await mongodbConnection();
  console.log("🌱 Seeding Zephix foundation data...");

  // 1) Super Admin role (wildcard, system-protected)
  let superRole = await RoleModel.findOne({ slug: "super-admin" });
  if (!superRole) {
    superRole = await RoleModel.create({
      name: "Super Admin",
      slug: "super-admin",
      description: "Full, unrestricted access to everything.",
      permissions: [WILDCARD_PERMISSION],
      is_system: true,
    });
    console.log("  ✓ Created Super Admin role");
  } else {
    console.log("  • Super Admin role already exists");
  }

  // 2) Example roles (create-if-missing)
  for (const r of EXAMPLE_ROLES) {
    const slug = slugify(r.name, { lower: true, strict: true });
    const exists = await RoleModel.findOne({ slug });
    if (!exists) {
      await RoleModel.create({ ...r, slug, is_system: false });
      console.log(`  ✓ Created role: ${r.name}`);
    }
  }

  // 3) Global settings singleton
  const settings = await SettingModel.findOne({ key: "global" });
  if (!settings) {
    await SettingModel.create({ key: "global" });
    console.log("  ✓ Created global settings");
  }

  // 4) Super Admin user
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@zephix.com").toLowerCase();
  const existingUser = await UserModel.findOne({ email });
  if (!existingUser) {
    const password = process.env.SEED_ADMIN_PASSWORD || "Admin@12345";
    await UserModel.create({
      name: process.env.SEED_ADMIN_NAME || "Super Admin",
      email,
      password: await BcryptInstance.hash(password),
      role: superRole._id,
      status: USER_STATUS.ACTIVE,
    });
    console.log(`  ✓ Created Super Admin user`);
    console.log(`     → email:    ${email}`);
    console.log(`     → password: ${password}`);
    console.log("     (change this password after first login)");
  } else {
    console.log("  • Super Admin user already exists");
  }

  console.log("✅ Seed complete.");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(async (error) => {
  console.error("❌ Seed failed:", error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
