import { Server } from "http";
import app from "./app";
import { envConfig } from "./config";
import mongodbConnection from "./config/mongoDbConnection";
import { registerCronJobs } from "./jobs/scheduler";

process.on("uncaughtException", (error) => {
  console.error(`Uncaught Exception: ${(error as Error).message}`, {
    stack: (error as Error).stack,
  });
  process.exit(1);
});

let server: Server;
const port = envConfig.app.port;

async function main() {
  try {
    await mongodbConnection();

    // Scheduled jobs — recurring invoices, reminders, overdue marking (spec §28).
    registerCronJobs();

    server = app.listen(port, () => {
      console.info(`🚀 Zephix Internal OS server running on port ${port}`);
    });
  } catch (error) {
    console.error(`❌ Failed to start server:`, error);
    process.exit(1);
  }

  process.on("unhandledRejection", (error) => {
    console.error(`Unhandled Promise Rejection:`, error);
    if (server) {
      server.close(() => process.exit(1));
    } else {
      process.exit(1);
    }
  });
}

main();

// process.on("SIGTERM", () => {
//   console.warn("SIGTERM received. Shutting down gracefully...");
//   if (server) {
//     server.close(() => console.info("Server closed."));
//   }
// });
