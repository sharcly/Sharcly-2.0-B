import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();
// SECURITY: NODE_TLS_REJECT_UNAUTHORIZED is NOT disabled globally.
// SSL is configured per-connection via the Pool ssl option below.
// We strip sslmode from the URL so that pg-connection-string's newer strict
// parsing (sslmode=require → verify-full) doesn't override our rejectUnauthorized.

const rawConnectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

// Remove sslmode from URL — SSL is handled by Pool config exclusively
const connectionString = rawConnectionString?.replace(/&sslmode=[^&]*/g, "").replace(/\?sslmode=[^&]*&?/g, "?").replace(/\?$/, "");

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prisma: PrismaClient;

if (!globalForPrisma.prisma) {
  const pool = new Pool({ 
    connectionString,
    ssl: {
      // Supabase uses a self-signed certificate chain.
      // This disables cert verification ONLY for this DB connection — NOT globally.
      rejectUnauthorized: false
    }
  });
  const adapter = new PrismaPg(pool);
  globalForPrisma.prisma = new PrismaClient({ adapter });
}

prisma = globalForPrisma.prisma;

export { prisma };