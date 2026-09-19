import serverless from "serverless-http";
import { app, connectDB } from "../../server-app";

let dbInitialized = false;
const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  // Allow function to return response immediately without waiting for open MongoDB sockets
  context.callbackWaitsForEmptyEventLoop = false;

  if (!dbInitialized) {
    try {
      await connectDB();
      dbInitialized = true;
    } catch (err: any) {
      console.error("[Netlify Function] Database connection error:", err.message);
    }
  }

  return serverlessHandler(event, context);
};
