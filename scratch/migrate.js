const { prisma } = require("../dist/common/lib/prisma");

async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS "restrictedStates" text[] DEFAULT '{}'::text[];`);
    console.log("Column added successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
