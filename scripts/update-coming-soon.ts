import { prisma } from "../src/common/lib/prisma";

async function main() {
  console.log('Starting bulk update for isComingSoon...');
  const result = await prisma.product.updateMany({
    data: {
      isComingSoon: true,
    },
  });
  console.log(`Successfully updated ${result.count} products to isComingSoon = true.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
