import { Router, Request, Response, NextFunction } from "express";
import { envConfig } from "@/config";
import { runJob } from "@/jobs/scheduler";
import { sensitiveLimiter } from "@/middlewares/rateLimit";

const router = Router();

/** Shared-secret gate for external schedulers (Vercel cron, etc.) — spec §28. */
const cronAuth = (req: Request, res: Response, next: NextFunction) => {
  const secret = req.headers["x-cron-secret"];
  if (
    !envConfig.security.cron_secret ||
    secret !== envConfig.security.cron_secret
  ) {
    res.status(401).json({
      statusCode: 401,
      success: false,
      message: "Unauthorized cron request.",
    });
    return;
  }
  next();
};

router.post("/:job", sensitiveLimiter, cronAuth, async (req: Request, res: Response) => {
  try {
    const result = await runJob(req.params.job);
    res.status(200).json({
      statusCode: 200,
      success: true,
      message: "Cron job executed.",
      data: result,
    });
  } catch (e) {
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: (e as Error).message,
    });
  }
});

export const CronRoutes = router;
