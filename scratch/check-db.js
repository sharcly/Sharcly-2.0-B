const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('GlobalSeoSettings:', await prisma.globalSeoSettings.findFirst());
  console.log('ApiIntegrations:', await prisma.apiIntegration.findMany());
}
main().catch(console.error).finally(() => prisma.$disconnect());
