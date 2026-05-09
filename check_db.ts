import { prisma } from "./src/common/lib/prisma";

async function check() {
  const flavours = await prisma.flavour.findMany();
  console.log("All Flavours:", JSON.stringify(flavours, null, 2));
  
  const products = await prisma.product.findMany({
    include: { flavours: true }
  });
  console.log("Products with flavours:", JSON.stringify(products.map(p => ({ id: p.id, name: p.name, flavours: p.flavours })), null, 2));
}

check().catch(console.error);
