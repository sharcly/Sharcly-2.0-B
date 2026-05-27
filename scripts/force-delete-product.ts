import { prisma } from "../src/common/lib/prisma";

async function main() {
  const sku = '958ed';
  
  console.log(`Looking for product with SKU: ${sku}`);
  const product = await prisma.product.findUnique({
    where: { sku: sku },
  });

  if (!product) {
    console.log(`Product with SKU ${sku} not found.`);
    return;
  }

  console.log(`Found product: ${product.name} (ID: ${product.id})`);

  // Forcefully delete related OrderItems first to satisfy foreign key constraints
  console.log('Deleting related OrderItems...');
  const deletedItems = await prisma.orderItem.deleteMany({
    where: { productId: product.id },
  });
  console.log(`Deleted ${deletedItems.count} associated order items.`);

  // Now delete the product
  console.log('Deleting the product...');
  await prisma.product.delete({
    where: { id: product.id },
  });
  
  console.log(`Successfully hard-deleted product with SKU: ${sku}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
