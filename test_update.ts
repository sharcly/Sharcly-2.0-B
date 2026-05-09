import { prisma } from "./src/common/lib/prisma";

async function testUpdate() {
  const productId = "a2f03132-6bf7-4f34-87ba-170d5f303ab8";
  const flavourId = "6304061e-e62d-408f-a987-56b6d6516718";
  
  console.log("Updating product...");
  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      flavours: {
        set: [{ id: flavourId }]
      }
    },
    include: { flavours: true }
  });
  
  console.log("Update result:", JSON.stringify(product.flavours, null, 2));
}

testUpdate().catch(console.error);
