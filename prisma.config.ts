import { defineConfig } from "prisma/config";
import dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.POSTGRES_URL_NON_POOLING || process.env.DIRECT_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL,
  },
});
