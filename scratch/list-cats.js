const { prisma } = require("../dist/common/lib/prisma");

async function main() {
  const cats = await prisma.category.findMany();
  console.log("Categories:", cats.map(c => c.slug));
  const flavours = await prisma.flavour.findMany();
  console.log("Flavours:", flavours.map(f => f.slug));
  process.exit(0);
}
main();
