import serverless from "serverless-http";
import { app, connectDB } from "../../server-app";

const serverlessHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  // Allow Lambda to finish response without waiting for background MongoDB connection pool sockets
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectDB();
  } catch (err: any) {
    console.error("[Netlify Function] Database connection error:", err.message);
  }

  return serverlessHandler(event, context);
};

