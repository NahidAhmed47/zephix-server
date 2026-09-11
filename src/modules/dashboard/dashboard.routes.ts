import { Router } from "express";
import { DashboardController } from "./dashboard.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";

const router = Router();

router.use(auth);
router.get("/", requirePermission("reports.view"), DashboardController.summary);

export const DashboardRoutes = router;
