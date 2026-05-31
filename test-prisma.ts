import { prisma } from "./src/common/lib/prisma";

async function main() {
  console.log("Checking StoreSettings and GlobalSeoSettings models...");
  try {
    const settings = await prisma.storeSettings.findFirst();
    console.log("Store Settings:", settings);
    const seo = await prisma.globalSeoSettings.findFirst();
    console.log("Global SEO:", seo);
  } catch (err: any) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
