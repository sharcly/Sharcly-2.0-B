import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const rawUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
let connectionString = rawUrl;
if (rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.delete("sslmode");
    connectionString = parsed.toString();
  } catch (e) {
    console.error("Failed to parse database connection URL:", e);
  }
}

if (connectionString) {
  process.env.DATABASE_URL = connectionString;
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prisma: PrismaClient;

if (!globalForPrisma.prisma) {
  const pool = new Pool({ 
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  const adapter = new PrismaPg(pool);
  globalForPrisma.prisma = new PrismaClient({ adapter });
}

prisma = globalForPrisma.prisma;

export { prisma };