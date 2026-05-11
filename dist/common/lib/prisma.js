"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// SECURITY: NODE_TLS_REJECT_UNAUTHORIZED is NOT disabled globally.
// SSL is configured per-connection via the Pool ssl option below.
// We strip sslmode from the URL so that pg-connection-string's newer strict
// parsing (sslmode=require → verify-full) doesn't override our rejectUnauthorized.
const rawConnectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
// Remove sslmode from URL — SSL is handled by Pool config exclusively
const connectionString = rawConnectionString?.replace(/&sslmode=[^&]*/g, "").replace(/\?sslmode=[^&]*&?/g, "?").replace(/\?$/, "");
const globalForPrisma = global;
let prisma;
if (!globalForPrisma.prisma) {
    const pool = new pg_1.Pool({
        connectionString,
        ssl: {
            // Supabase uses a self-signed certificate chain.
            // This disables cert verification ONLY for this DB connection — NOT globally.
            rejectUnauthorized: false
        }
    });
    const adapter = new adapter_pg_1.PrismaPg(pool);
    globalForPrisma.prisma = new client_1.PrismaClient({ adapter });
}
exports.prisma = prisma = globalForPrisma.prisma;
