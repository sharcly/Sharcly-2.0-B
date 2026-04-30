import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Testing connection...');
  try {
    const permissionsCount = await prisma.permission.count();
    console.log('Permission count:', permissionsCount);
  } catch (err) {
    console.error('Connection failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
