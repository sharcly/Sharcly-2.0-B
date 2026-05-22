import { prisma } from '../src/common/lib/prisma';

async function main() {
  console.log('GlobalSeoSettings:', await prisma.globalSeoSettings.findFirst());
  console.log('ApiIntegrations:', await prisma.apiIntegration.findMany());
}

main().catch(console.error).finally(() => process.exit(0));
