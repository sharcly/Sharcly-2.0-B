import { prisma } from "./src/common/lib/prisma";

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, stock: true },
    take: 5
  });
  console.log('--- PRODUCTS ---');
  console.log(JSON.stringify(products, null, 2));
  
  const variants = await prisma.productVariant.findMany({
    select: { id: true, title: true, inventoryQuantity: true },
    take: 5
  });
  console.log('--- VARIANTS ---');
  console.log(JSON.stringify(variants, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
