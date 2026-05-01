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

const app = express();
const port = process.env.PORT || 5000;

// Swagger Documentation
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // general API limit
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // strict limit on login/register
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts, please try again in 15 minutes." },
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), environment: process.env.NODE_ENV });
});

// ─── Core Middleware ──────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://207.2.123.86:3000",
  "https://sharcly.io",
  "https://sharcly-2-0.vercel.app"
].filter(Boolean).map(o => o?.replace(/\/$/, "")) as string[];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.replace(/\/$/, "");
    const isAllowed = allowedOrigins.includes(normalizedOrigin);
    const isVercelPreview = normalizedOrigin.endsWith(".vercel.app") && 
                           (normalizedOrigin.includes("sharcly-2-0") || normalizedOrigin.includes("james-projects"));

    if (isAllowed || isVercelPreview) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Origin ${origin} not allowed`);
      callback(new Error("Not allowed by CORS"));
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
    "X-Api-Version", 
    "X-App-Version",
    "Accept-Version"
  ],
  exposedHeaders: ["set-cookie"]
};

app.use(cors(corsOptions));

app.use(compression());
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "http://207.2.123.86:8181", "http://207.2.123.86:3000", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
}));

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use("/api", globalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/refresh-token", authLimiter);
app.use("/api/auth/verify-email", authLimiter);

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many search requests, please slow down." },
});
app.use("/api/search", searchLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api", apiRoutes);
import imageRouter from "./modules/image/image.router";
app.use("/images", imageRouter);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error("[ERROR]", err.stack);
  const isProduction = process.env.NODE_ENV === "production";
  res.status(err.status || 500).json({
    success: false,
    message: isProduction ? "An internal error occurred" : (err.message || "Internal Server Error"),
  });
});

import { BlogWorker } from "./modules/blog/blog.worker";

// ─── Server Start ─────────────────────────────────────────────────────────────
async function startServer() {
  try {
    await bootstrap();
    BlogWorker.init();

    const server = app.listen(port, () => {
      console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
    });

    server.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        console.error(`❌ Port ${port} is already in use.`);
        process.exit(1);
      } else {
        console.error("❌ Server error:", err);
      }
    });

    const gracefullyShutdown = async (signal: string) => {
      console.log(`\nStopping server due to ${signal}...`);
      server.close(async () => {
        try {
          await prisma.$disconnect();
          process.exit(0);
        } catch (err) {
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => gracefullyShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefullyShutdown("SIGTERM"));
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Only start the server if not running on Vercel
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  startServer();
}

export default app;

