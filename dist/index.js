"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_config_1 = __importDefault(require("./common/config/swagger.config"));
const routes_1 = __importDefault(require("./routes"));
const bootstrap_1 = require("./common/utils/bootstrap");
const image_router_1 = __importDefault(require("./modules/image/image.router"));
const blog_worker_1 = require("./modules/blog/blog.worker");
// import { track } from "@vercel/analytics/server"; // Replaced with dynamic import below
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
// ✅ Essential for Vercel: Trust the proxy headers
app.set("trust proxy", 1);
/* ─────────────────────────────────────────────
   ✅ CORS CONFIGURATION (Dynamic & Robust)
──────────────────────────────────────────── */
const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://sharcly.com",
    "https://www.sharcly.com",
    "https://sharcly-2-0.vercel.app",
    process.env.FRONTEND_URL,
].filter(Boolean);
const corsOptions = {
    origin: (origin, callback) => {
        // Allow non-browser requests (like mobile apps or curl)
        if (!origin)
            return callback(null, true);
        const normalizedOrigin = origin.replace(/\/$/, "").toLowerCase();
        // Check against explicit allowed list
        const isAllowed = allowedOrigins.some(o => o.toLowerCase().replace(/\/$/, "") === normalizedOrigin);
        // Allow all Vercel subdomains that contain 'sharcly' (previews, branches, etc.)
        const isVercel = normalizedOrigin.endsWith(".vercel.app") && normalizedOrigin.includes("sharcly");
        if (isAllowed || isVercel) {
            callback(null, true);
        }
        else {
            console.warn(`[CORS] Blocked origin: ${origin}`);
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
        "X-Api-Version",
        "sentry-trace",
        "baggage"
    ],
    exposedHeaders: ["set-cookie"],
    optionsSuccessStatus: 200,
    maxAge: 86400
};
// Global CORS Middleware
app.use((0, cors_1.default)(corsOptions));
// Force Vary: Origin header to prevent Vercel CDN caching issues
app.use((req, res, next) => {
    res.header("Vary", "Origin");
    next();
});
/* ─────────────────────────────────────────────
   Middlewares
──────────────────────────────────────────── */
app.use((0, compression_1.default)());
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: false
}));
app.use((0, morgan_1.default)(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use((0, cookie_parser_1.default)());
// ✅ Stripe Webhook must use raw body
app.use("/api/payments/webhook", express_1.default.raw({ type: "application/json" }));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
// Vercel Analytics Middleware (Track API Hits)
app.use(async (req, res, next) => {
    if (process.env.VERCEL) {
        try {
            const { track } = await import("@vercel/analytics/server");
            track("api_hit", {
                path: req.path,
                method: req.method,
            });
        }
        catch (err) {
            // Ignore analytics errors to prevent app crash
        }
    }
    next();
});
/* ─────────────────────────────────────────────
   Rate Limiting
──────────────────────────────────────────── */
const csrf_middleware_1 = require("./common/middlewares/csrf.middleware");
app.use("/api", (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 500
}));
// Global CSRF Protection
app.use("/api", csrf_middleware_1.csrfProtection);
/* ─────────────────────────────────────────────
   Health Check
──────────────────────────────────────────── */
app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});
/* ─────────────────────────────────────────────
   Swagger
──────────────────────────────────────────── */
const swaggerSpec = (0, swagger_jsdoc_1.default)(swagger_config_1.default);
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
/* ─────────────────────────────────────────────
   Routes
──────────────────────────────────────────── */
app.use("/api", routes_1.default);
app.use("/images", image_router_1.default);
/* ─────────────────────────────────────────────
   Error Handler
──────────────────────────────────────────── */
app.use((err, req, res, next) => {
    console.error("[ERROR]", err);
    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === "production"
            ? "Internal Server Error"
            : err.message
    });
});
/* ─────────────────────────────────────────────
   Server Start (ONLY local / non-vercel)
──────────────────────────────────────────── */
async function startServer() {
    try {
        await (0, bootstrap_1.bootstrap)();
        blog_worker_1.BlogWorker.init();
        app.listen(port, () => {
            console.log(`⚡ Server running on http://localhost:${port}`);
        });
    }
    catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
}
if (!process.env.VERCEL) {
    startServer();
}
exports.default = app;
