import dotenv from "dotenv";
dotenv.config();

import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { prisma } from "./common/lib/prisma";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerOptions from "./common/config/swagger.config";

import apiRoutes from "./routes";
import { bootstrap } from "./common/utils/bootstrap";
import imageRouter from "./modules/image/image.router";
import { BlogWorker } from "./modules/blog/blog.worker";

const app = express();
const port = process.env.PORT || 5000;

/* ─────────────────────────────────────────────
   ✅ CORS FIX (FINAL PRODUCTION VERSION)
──────────────────────────────────────────── */

const allowedOrigins = [
  "http://localhost:3000",
  "https://sharcly.io",
  "https://sharcly-2-0.vercel.app",
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/$/, "").toLowerCase();
    const isAllowed = allowedOrigins.some(o => o?.toLowerCase().replace(/\/$/, "") === normalizedOrigin);
    const isVercel = normalizedOrigin.endsWith(".vercel.app");

    if (isAllowed || isVercel) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "X-CSRF-Token",
    "X-Api-Version"
  ],
  maxAge: 86400
};

app.use(cors(corsOptions));

// ✅ Fix for Express 5 wildcard crash
app.options("/:path*", cors(corsOptions));

/* ─────────────────────────────────────────────
   Middlewares
──────────────────────────────────────────── */

app.use(compression());

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(cookieParser());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ─────────────────────────────────────────────
   Rate Limiting
──────────────────────────────────────────── */

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500
  })
);

/* ─────────────────────────────────────────────
   Health Check
──────────────────────────────────────────── */

app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

/* ─────────────────────────────────────────────
   Swagger
──────────────────────────────────────────── */

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* ─────────────────────────────────────────────
   Routes
──────────────────────────────────────────── */

app.use("/api", apiRoutes);
app.use("/images", imageRouter);

/* ─────────────────────────────────────────────
   Error Handler
──────────────────────────────────────────── */

app.use((err: any, req: Request, res: Response, next: any) => {
  console.error("[ERROR]", err);

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message
  });
});

/* ─────────────────────────────────────────────
   Server Start (ONLY local / non-vercel)
──────────────────────────────────────────── */

async function startServer() {
  try {
    await bootstrap();
    BlogWorker.init();

    app.listen(port, () => {
      console.log(`⚡ Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;