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
// import { track } from "@vercel/analytics/server"; // Replaced with dynamic import below

const app = express();
const port = process.env.PORT || 5000;

// ✅ Essential for Vercel: Trust the proxy headers
app.set("trust proxy", 1);

/* ─────────────────────────────────────────────
   ✅ CORS CONFIGURATION (Dynamic & Robust)
──────────────────────────────────────────── */

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://sharcly.io",
  "https://www.sharcly.io",
  "https://sharcly-2-0.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.replace(/\/$/, "").toLowerCase();
    const isAllowed = allowedOrigins.some(o => o.toLowerCase().replace(/\/$/, "") === normalizedOrigin);
    const isVercel = normalizedOrigin.endsWith(".vercel.app") || normalizedOrigin.includes("sharcly");

    if (isAllowed || isVercel) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "X-CSRF-Token", "X-Api-Version"],
  exposedHeaders: ["set-cookie"],
  optionsSuccessStatus: 200,
  maxAge: 86400
};

// Global CORS Middleware
app.use(cors(corsOptions));

// Force Vary: Origin header to prevent Vercel CDN caching issues
app.use((req, res, next) => {
  res.header("Vary", "Origin");
  next();
});

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

// ✅ Stripe Webhook must use raw body
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Vercel Analytics Middleware (Track API Hits)
app.use(async (req, res, next) => {
  if (process.env.VERCEL) {
    try {
      const { track } = await import("@vercel/analytics/server");
      track("api_hit", {
        path: req.path,
        method: req.method,
      });
    } catch (err) {
      // Ignore analytics errors to prevent app crash
    }
  }
  next();
});

/* ─────────────────────────────────────────────
   Rate Limiting
──────────────────────────────────────────── */

import { csrfProtection } from "./common/middlewares/csrf.middleware";

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500
  })
);

// Global CSRF Protection
app.use("/api", csrfProtection);

/* ─────────────────────────────────────────────
   Health Check
──────────────────────────────────────────── */

app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
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