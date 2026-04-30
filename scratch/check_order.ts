import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.order.findUnique({
    where: { id: 'b872b769-6f3b-4a8a-b1d3-488912c183ae' }
  });
  console.log(JSON.stringify(order, null, 2));
}
main();
