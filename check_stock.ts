import { prisma } from "./src/common/lib/prisma";

async function main() {
  const p = await prisma.product.findUnique({ where: { id: "f851d509-8c23-4738-b34b-0e4ea785c490" } });
  console.log(`Product: ${p?.name}, Stock: ${p?.stock}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
