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
const connectionString = process.env.DATABASE_URL;
const globalForPrisma = global;
let prisma;
if (!globalForPrisma.prisma) {
    const pool = new pg_1.Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });
    const adapter = new adapter_pg_1.PrismaPg(pool);
    globalForPrisma.prisma = new client_1.PrismaClient({ adapter });
}
exports.prisma = prisma = globalForPrisma.prisma;
