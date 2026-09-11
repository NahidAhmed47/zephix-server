import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import globalErrorHandler from "./middlewares/globalErrorHandler";
import router from "./routes";
import { CronRoutes } from "./modules/cron/cron.routes";
import { corsOptions } from "./config/corsOptions";

const app = express();

// core middlewares
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(helmet());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(morgan("dev"));

// root health check
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    statusCode: 200,
    success: true,
    message: "Zephix Internal OS API is running...",
    data: null,
  });
});

// application routes
app.use("/api/v1", router);

// internal scheduled-job triggers (CRON_SECRET-gated) — spec §28
app.use("/internal/cron", CronRoutes);

// global error handler
app.use(globalErrorHandler.globalErrorHandler);

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    statusCode: 404,
    success: false,
    message: "Not Found",
    errorMessages: [{ path: req.originalUrl, message: "API Not Found" }],
  });
  next();
});

export default app;
