const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function test() {
  try {
    const products = await prisma.product.findMany({
      take: 1
    });
    console.log("Success! Products found:", products.length);
    if (products.length > 0) {
      console.log("First product testimonials:", products[0].testimonials);
    }
  } catch (err) {
    console.error("Prisma query failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
