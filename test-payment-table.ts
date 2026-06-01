import { prisma } from "./src/common/lib/prisma";

async function main() {
  try {
    const count = await prisma.paymentProviderConfig.count();
    console.log("✅ payment_provider_configs table exists. Row count:", count);
  } catch (e: any) {
    console.error("❌ Table check failed:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
