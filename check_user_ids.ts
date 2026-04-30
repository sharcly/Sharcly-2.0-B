import { prisma } from "./src/common/lib/prisma";

async function main() {
  const ids = ["f851d509-8c23-4738-b34b-0e4ea785c490", "rec1"];
  for (const id of ids) {
    const product = await prisma.product.findUnique({ where: { id } });
    const variant = await prisma.productVariant.findUnique({ where: { id } });
    console.log(`ID: ${id}`);
    console.log(`Product: ${product ? product.name : 'Not Found'}`);
    console.log(`Variant: ${variant ? variant.title : 'Not Found'}`);
    console.log('---');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
