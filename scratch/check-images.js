const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const images = await prisma.productImage.findMany({
    take: 5,
    select: { id: true, mimeType: true, productId: true }
  });
  console.log('Sample Images:', JSON.stringify(images, null, 2));
  
  const products = await prisma.product.findMany({
    take: 5,
    select: { id: true, name: true, images: { select: { id: true } } }
  });
  console.log('Sample Products:', JSON.stringify(products, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
