import { PrismaClient } from '../src/generated/client';
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;
const pool = new Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Adding Sales Analytics Permission ---');
  
  const permission = await prisma.permission.upsert({
    where: { slug: 'sales.view' },
    update: {
      name: 'Sales Analytics',
      group: 'Analytics',
      description: 'Full access to sales performance, regional data, and revenue trends'
    },
    create: {
      name: 'Sales Analytics',
      slug: 'sales.view',
      group: 'Analytics',
      description: 'Full access to sales performance, regional data, and revenue trends'
    },
  });

  console.log('Permission created/updated:', permission);

  // Assign to Admin role automatically
  const adminRole = await prisma.role.findUnique({ where: { slug: 'admin' } });
  if (adminRole) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    });
    console.log('Assigned to Admin role.');
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
