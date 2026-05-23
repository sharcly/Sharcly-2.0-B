const { prisma } = require("../dist/common/lib/prisma");

async function main() {
  const products = await prisma.product.findMany({ select: { name: true, category: { select: { slug: true } } } });
  console.log("Products:", products);
  process.exit(0);
}
main();
