import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

import connectDB from './config/db.js';
import { initializeSocket } from './config/socket.js';
import leadRoutes from './routes/lead.routes.js';
import ApiResponse from './utils/ApiResponse.js';
import notFound from './middleware/notFound.middleware.js';
import errorHandler from './middleware/error.middleware.js';
import metaWebhookRoutes from "./routes/metaWebhook.routes.js";
import { startMetaTestLeadPolling } from "./services/metaTestLeadPoller.service.js";

dotenv.config({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
});

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use("/webhooks/meta", metaWebhookRoutes);
app.use(express.json());

initializeSocket(server);

app.get("/", (req, res) => {
  return res.status(200).json(
    new ApiResponse(200, {
      webhook: "/webhooks/meta",
      health: "/health",
    }, "LeadFlow backend is running")
  );
});

app.get("/health", (req, res) => {
  return res.status(200).json(
    new ApiResponse(200, {
      database: "connected",
    }, "Backend is healthy")
  );
});

app.use("/api/v1/leads", leadRoutes);

app.use(notFound);
app.use(errorHandler);

const startServer = async ()=>{
  const PORT = process.env.PORT || 3000;

  // Make webhook verification reachable while MongoDB is connecting.
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
  });

  try {
    await connectDB();
    startMetaTestLeadPolling();
  } catch (error) {
    console.error(
      "Database connection failed; webhook verification remains available:",
      error.message
    );
  }
};

startServer();
