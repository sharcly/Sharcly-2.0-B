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
const prisma_1 = require("./common/lib/prisma");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_config_1 = __importDefault(require("./common/config/swagger.config"));
const routes_1 = __importDefault(require("./routes"));
const bootstrap_1 = require("./common/utils/bootstrap");
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
// Swagger Documentation
const swaggerSpec = (0, swagger_jsdoc_1.default)(swagger_config_1.default);
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
// ─── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // general API limit
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please try again later." },
});
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // strict limit on login/register
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many authentication attempts, please try again in 15 minutes." },
});
// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use((0, compression_1.default)());
app.use((0, helmet_1.default)({
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
app.use((0, cors_1.default)({
    origin: [
        process.env.FRONTEND_URL || "http://localhost:3000",
        "http://localhost:3000",
        "http://207.2.123.86:3000"
    ],
    credentials: true, // Required for httpOnly cookies
}));
// Use 'combined' in production for structured logs, 'dev' for local
app.use((0, morgan_1.default)(process.env.NODE_ENV === "production" ? "combined" : "dev"));
// Parse cookies (needed for httpOnly token cookies)
app.use((0, cookie_parser_1.default)());
// Body parsing with size limits to prevent DoS
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
// Apply global rate limit
app.use("/api", globalLimiter);
// Apply strict rate limit on auth endpoints
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/refresh-token", authLimiter);
app.use("/api/auth/verify-email", authLimiter);
// Search rate limit — prevent DoS via repeated expensive queries
const searchLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many search requests, please slow down." },
});
app.use("/api/search", searchLimiter);
// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api", routes_1.default);
const image_router_1 = __importDefault(require("./modules/image/image.router"));
app.use("/images", image_router_1.default);
// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    // Log full error internally
    console.error("[ERROR]", err.stack);
    // Never expose internal error details in production
    const isProduction = process.env.NODE_ENV === "production";
    res.status(err.status || 500).json({
        success: false,
        message: isProduction ? "An internal error occurred" : (err.message || "Internal Server Error"),
    });
});
const blog_worker_1 = require("./modules/blog/blog.worker");
// ─── Server Start ─────────────────────────────────────────────────────────────
async function startServer() {
    try {
        await (0, bootstrap_1.bootstrap)();
        blog_worker_1.BlogWorker.init();
        const server = app.listen(port, () => {
            console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
        });
        server.on("error", (err) => {
            if (err.code === "EADDRINUSE") {
                console.error(`❌ Port ${port} is already in use.`);
                process.exit(1);
            }
            else {
                console.error("❌ Server error:", err);
            }
        });
        const gracefullyShutdown = async (signal) => {
            console.log(`\nStopping server due to ${signal}...`);
            server.close(async () => {
                console.log("HTTP server closed.");
                try {
                    await prisma_1.prisma.$disconnect();
                    console.log("Database connection closed.");
                    process.exit(0);
                }
                catch (err) {
                    console.error("Error during shutdown:", err);
                    process.exit(1);
                }
            });
            setTimeout(() => {
                console.error("Could not close connections in time, forcefully shutting down");
                process.exit(1);
            }, 10000);
        };
        process.on("SIGINT", () => gracefullyShutdown("SIGINT"));
        process.on("SIGTERM", () => gracefullyShutdown("SIGTERM"));
    }
    catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
}
startServer();
