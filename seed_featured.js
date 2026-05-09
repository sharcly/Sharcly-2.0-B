const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    take: 8
  });
  
  if (products.length === 0) {
    console.log("No products found to mark as featured.");
    return;
  }

  for (const product of products) {
    await prisma.product.update({
      where: { id: product.id },
      data: { featured: true }
    });
    console.log(`Marked ${product.name} as featured.`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
