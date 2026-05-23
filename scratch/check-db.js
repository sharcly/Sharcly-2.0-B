const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.findUnique({
    where: { id: "a2f03132-6bf7-4f34-87ba-170d5f303ab8" },
    include: { variants: true }
  });
  console.log(JSON.stringify(product, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
