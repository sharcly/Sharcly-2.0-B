import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const settings = await prisma.storeSettings.findFirst();
  console.log(JSON.stringify(settings, null, 2));
}
main();
