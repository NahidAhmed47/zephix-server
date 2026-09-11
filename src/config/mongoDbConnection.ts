import mongoose from "mongoose";
import { envConfig } from ".";
import dotenv from "dotenv";

dotenv.config();

const mongodbConnection = async (retries = 5, interval = 5000) => {
  let attempts = 0;

  const tryConnect = async () => {
    attempts++;
    try {
      await mongoose.connect(envConfig.database.mongodb_url, {
        maxPoolSize: 15,
        minPoolSize: 0,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log("MongoDB Connected...");
      return true;
    } catch (err) {
      console.error(
        `MongoDB Connection Error (Attempt ${attempts}/${retries}):`,
        err
      );
      if (attempts >= retries) {
        console.error(
          "Max MongoDB connection attempts reached, exiting application"
        );
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
      return tryConnect();
    }
  };

  return tryConnect();
};

export default mongodbConnection;
