import { prisma } from "../src/common/lib/prisma";

async function testRelations() {
  try {
    // Try to include everything one by one to see what fails
    const relations = [
      "category",
      "type",
      "tags",
      "flavours",
      "variants",
      "images",
      "ProductToTag",
      "orderItems",
      "reviews",
      "collections",
      "wishlistedBy"
    ];

    for (const rel of relations) {
      try {
        console.log(`Testing include: ${rel}...`);
        await prisma.product.findFirst({
          include: { [rel]: true }
        });
        console.log(`  Success: ${rel}`);
      } catch (e: any) {
        console.log(`  Failed: ${rel} - ${e.message.split('\n')[0]}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

testRelations();
